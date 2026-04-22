import { Page } from 'puppeteer';

export interface InvoiceEntry {
  invoiceNumber: string | null;
  invoiceType: string | null;
  amount: number | null;
  currency: string | null;
  downloadUrl: string | null;
  rawText: string;
}

export async function parseInvoiceList(page: Page): Promise<InvoiceEntry[]> {
  const invoices: InvoiceEntry[] = [];
  let hasNextPage = true;

  while (hasNextPage) {
    const pageInvoices = await extractInvoicesFromPage(page);
    invoices.push(...pageInvoices);
    hasNextPage = await goToNextPage(page);
  }

  return invoices;
}

async function extractInvoicesFromPage(page: Page): Promise<InvoiceEntry[]> {
  return page.evaluate(() => {
    const results: Array<{
      invoiceNumber: string | null;
      invoiceType: string | null;
      amount: number | null;
      currency: string | null;
      downloadUrl: string | null;
      rawText: string;
    }> = [];

    // Try multiple container/row selectors
    const rowSelectors = [
      '[data-testid="invoice-row"]',
      '[data-testid="transaction-row"]',
      'tbody tr',
      '[role="row"]',
      '.invoice-item',
      'li[data-invoice-id]',
    ];

    let rows: NodeListOf<Element> | null = null;
    for (const sel of rowSelectors) {
      const found = document.querySelectorAll(sel);
      if (found.length > 0) {
        rows = found;
        break;
      }
    }

    if (!rows || rows.length === 0) return results;

    rows.forEach((row) => {
      const text = row.textContent || '';

      // Extract download link
      const links = row.querySelectorAll('a[href]');
      let downloadUrl: string | null = null;
      links.forEach((link) => {
        const href = (link as HTMLAnchorElement).href;
        if (
          href.includes('.pdf') ||
          href.includes('download') ||
          href.includes('invoice') ||
          href.includes('receipt')
        ) {
          downloadUrl = href;
        }
      });

      // Extract invoice number from text patterns like INV-12345 or #12345
      const invoiceNumMatch = text.match(/(?:INV|Invoice|#)\s*[-–]?\s*(\w+)/i);
      const invoiceNumber = invoiceNumMatch ? invoiceNumMatch[1] : null;

      // Extract invoice type
      const typeMatch = text.match(/(?:commission|vat|service fee|management fee)/i);
      const invoiceType = typeMatch ? typeMatch[0].toLowerCase() : 'commission';

      // Extract amount and currency
      const amountMatch = text.match(/([€$£¥]|EUR|USD|GBP)\s*([\d,]+\.?\d*)/i);
      let amount: number | null = null;
      let currency: string | null = null;
      if (amountMatch) {
        currency = amountMatch[1].toUpperCase();
        amount = parseFloat(amountMatch[2].replace(',', ''));
      }

      if (downloadUrl || invoiceNumber) {
        results.push({ invoiceNumber, invoiceType, amount, currency, downloadUrl, rawText: text.trim() });
      }
    });

    return results;
  });
}

async function goToNextPage(page: Page): Promise<boolean> {
  const nextSelectors = [
    '[data-testid="pagination-next"]',
    'button[aria-label="Next page"]',
    'a[rel="next"]',
    '.pagination-next:not([disabled])',
  ];

  for (const sel of nextSelectors) {
    const el = await page.$(sel);
    if (el) {
      const disabled = await page.evaluate(
        (e) => e.hasAttribute('disabled') || e.classList.contains('disabled'),
        el
      );
      if (!disabled) {
        await el.click();
        await page.waitForTimeout(2000);
        return true;
      }
    }
  }

  return false;
}
