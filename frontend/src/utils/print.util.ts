/**
 * Printing Utility
 * Handles browser-based printing by creating a hidden iframe
 * and injecting HTML content for thermal printers or standard paper.
 */

export const printContent = (html: string, title: string = 'Print') => {
  // Create a hidden iframe
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.id = 'print-iframe';

  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (!doc) {
    console.error('Could not access iframe document');
    return;
  }

  // Inject content and styles
  doc.open();
  doc.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>
          @page {
            margin: 0;
          }
          body {
            font-family: 'Courier New', Courier, monospace;
            padding: 10px;
            margin: 0;
            color: black;
          }
          /* Receipt Styling (Typical 80mm width) */
          .receipt {
            width: 300px;
            max-width: 100%;
            margin: 0 auto;
          }
          .receipt h1 {
            text-align: center;
            font-size: 20px;
            margin: 10px 0;
          }
          .receipt .divider {
            border-top: 1px dashed black;
            margin: 10px 0;
          }
          .receipt .item {
            display: flex;
            justify-content: space-between;
            margin-bottom: 5px;
          }
          .receipt .total {
            font-weight: bold;
            font-size: 18px;
            text-align: right;
            margin-top: 10px;
          }
          .receipt .footer {
            text-align: center;
            font-size: 12px;
            margin-top: 20px;
          }
          /* Ticket Styling (Kitchen/Bar) */
          .ticket {
            width: 300px;
            max-width: 100%;
            border: 2px solid black;
            padding: 10px;
          }
          .ticket .header {
            text-align: center;
            border-bottom: 2px solid black;
            padding-bottom: 5px;
            margin-bottom: 10px;
          }
          .ticket .item-row {
            font-size: 22px;
            font-weight: bold;
            margin-bottom: 10px;
          }
          .ticket .notes {
            font-style: italic;
            background: #eee;
            padding: 5px;
            margin-top: 5px;
            font-size: 14px;
          }
          /* Report Styling (A4) */
          .report {
            width: 210mm;
            padding: 20mm;
            margin: 0 auto;
          }
          @media print {
            .no-print { display: none; }
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        ${html}
        <script>
          window.onload = () => {
            window.print();
            setTimeout(() => {
              window.frameElement.remove();
            }, 100);
          };
        </script>
      </body>
    </html>
  `);
  doc.close();
};

export const generateReceiptHTML = (order: any, storeName: string = 'FOOD APP') => {
  // Handle both `items` (counter) and `orderItems` (waiter/online) field names
  const items = order.items || order.orderItems || [];
  const itemsHTML = items.map((item: any) => {
    const menuItemName = item.menuItem?.name || item.name || 'Item';
    const price = item.price ?? item.unitPrice ?? 0;
    const qty = item.quantity ?? 1;
    return `
    <div class="item">
      <span>${qty}x ${menuItemName}</span>
      <span>€${(parseFloat(price) * qty).toFixed(2)}</span>
    </div>
    ${item.notes ? `<div style="font-size: 10px; font-style: italic; margin-bottom: 5px;">* ${item.notes}</div>` : ''}
  `;
  }).join('');

  // Handle different user shapes
  const user = order.user || {};
  const customerName = user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Guest';

  return `
    <div class="receipt">
      <h1>${storeName}</h1>
      <div style="text-align: center; font-size: 12px;">
        Order #${order.orderNumber}<br>
        Date: ${new Date(order.createdAt).toLocaleString()}<br>
        Customer: ${customerName}
      </div>
      <div class="divider"></div>
      ${itemsHTML}
      <div class="divider"></div>
      <div class="item">
        <span>Subtotal</span>
        <span>€${parseFloat(order.subtotal || order.totalAmount || 0).toFixed(2)}</span>
      </div>
      ${order.deliveryFee && parseFloat(order.deliveryFee) > 0 ? `
      <div class="item">
        <span>Delivery Fee</span>
        <span>€${parseFloat(order.deliveryFee).toFixed(2)}</span>
      </div>` : ''}
      ${order.loyaltyDiscount && parseFloat(order.loyaltyDiscount) > 0 ? `
      <div class="item" style="color: red;">
        <span>Loyalty Discount</span>
        <span>-€${parseFloat(order.loyaltyDiscount).toFixed(2)}</span>
      </div>
      ` : ''}
      <div class="total">Total: €${parseFloat(order.totalAmount).toFixed(2)}</div>
      <div class="footer">
        Thank you for your order!<br>
        Please visit us again soon.
      </div>
    </div>
  `;
};

export const generateKitchenTicketHTML = (order: any, station: string = 'Kitchen') => {
  // Handle both `items` and `orderItems` field names — print ALL items, no station filtering
  const allItems = order.items || order.orderItems || [];

  if (allItems.length === 0) return '';

  const itemsHTML = allItems.map((item: any) => {
    const name = item.menuItem?.name || item.name || 'Item';
    return `
    <div class="item-row">
      ${item.quantity}x ${name}
      ${item.notes ? `<div class="notes">NOTE: ${item.notes}</div>` : ''}
    </div>
  `;
  }).join('');

  const headerLabel = (station === 'all' || station === 'Order' || station === 'Όλα') ? 'KITCHEN' : station.toUpperCase();

  return `
    <div class="ticket">
      <div class="header">
        <h2 style="margin: 0;">${headerLabel} TICKET</h2>
        <div style="font-size: 18px; font-weight: bold;">#${order.orderNumber?.split('-')[1] || order.orderNumber}</div>
        <div>${new Date().toLocaleTimeString()}</div>
      </div>
      <div class="body">
        ${itemsHTML}
      </div>
      <div style="border-top: 2px solid black; margin-top: 10px; padding-top: 5px; font-size: 12px; text-align: center;">
        Table: ${order.tableNumber || 'Delivery'} | Server: ${order.waiterName || 'POS'}
      </div>
    </div>
  `;
};

export const generateReportHTML = (data: any, title: string) => {
  // Simplified report layout
  return `
    <div class="report">
      <h1 style="text-align: center; border-bottom: 2px solid #ccc; padding-bottom: 10px;">${title}</h1>
      <div style="margin-bottom: 30px;">
        <h3>Summary Statistics</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="background: #f4f4f4;">
            <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Metric</th>
            <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">Value</th>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;">Total Orders</td>
            <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${data.summary.totalOrders}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;">Total Revenue</td>
            <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">€${data.summary.totalRevenue}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;">Delivered Count</td>
            <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${data.summary.deliveredCount}</td>
          </tr>
        </table>
      </div>
      
      <div>
        <h3>Daily Trend</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
          <tr style="background: #f4f4f4;">
            <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Date</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: right;">Orders</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: right;">Revenue (€)</th>
          </tr>
          ${data.daily.map((d: any) => `
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;">${d.date}</td>
              <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${d.orders}</td>
              <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${d.revenue.toFixed(2)}</td>
            </tr>
          `).join('')}
        </table>
      </div>
      
      <div style="margin-top: 50px; text-align: center; font-size: 10px; color: #777;">
        Report generated on ${new Date().toLocaleString()}
      </div>
    </div>
  `;
};
