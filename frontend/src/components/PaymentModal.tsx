// ============================================================================
// NEW COMPONENT: PaymentModal.tsx
// ============================================================================
// Location: frontend/src/components/PaymentModal.tsx
// Purpose: Show total and confirm payment before completing session
// ============================================================================

import { useState } from 'react';

interface PaymentModalProps {
  session: any;
  onConfirm: () => void;
  onCancel: () => void;
  isProcessing: boolean;
}

export default function PaymentModal({ session, onConfirm, onCancel, isProcessing }: PaymentModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'other'>('cash');
  
  // Calculate total from all orders
  const totalAmount = session.orders?.reduce((sum: number, order: any) => {
    return sum + Number(order.totalAmount);
  }, 0) || 0;

  const orderCount = session.orders?.length || 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold">💳 Complete Payment</h2>
              <p className="text-gray-600">Table {session.table?.tableNumber}</p>
            </div>
            <button
              onClick={onCancel}
              disabled={isProcessing}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          {/* Order Summary */}
          <div className="mb-6">
            <div className="text-sm font-semibold text-gray-700 mb-2">
              Order Summary ({orderCount} order{orderCount !== 1 ? 's' : ''})
            </div>
            <div className="space-y-2 mb-4">
              {session.orders?.map((order: any) => (
                <div key={order.id} className="flex justify-between text-sm bg-gray-50 p-2 rounded">
                  <span>{order.orderNumber}</span>
                  <span className="font-semibold">€{Number(order.totalAmount).toFixed(2)}</span>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="border-t-2 border-gray-300 pt-3">
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold">TOTAL TO PAY</span>
                <span className="text-3xl font-bold text-green-600">
                  €{totalAmount.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Payment Method
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setPaymentMethod('cash')}
                className={`p-3 rounded-lg border-2 text-center transition ${
                  paymentMethod === 'cash'
                    ? 'border-green-500 bg-green-50 text-green-700 font-semibold'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-2xl mb-1">💵</div>
                <div className="text-xs">Cash</div>
              </button>
              <button
                onClick={() => setPaymentMethod('card')}
                className={`p-3 rounded-lg border-2 text-center transition ${
                  paymentMethod === 'card'
                    ? 'border-green-500 bg-green-50 text-green-700 font-semibold'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-2xl mb-1">💳</div>
                <div className="text-xs">Card</div>
              </button>
              <button
                onClick={() => setPaymentMethod('other')}
                className={`p-3 rounded-lg border-2 text-center transition ${
                  paymentMethod === 'other'
                    ? 'border-green-500 bg-green-50 text-green-700 font-semibold'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-2xl mb-1">📱</div>
                <div className="text-xs">Other</div>
              </button>
            </div>
          </div>

          {/* Session Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
            <div className="text-sm">
              <div className="flex justify-between mb-1">
                <span className="text-gray-600">Party Size:</span>
                <span className="font-semibold">{session.partySize} guests</span>
              </div>
              <div className="flex justify-between mb-1">
                <span className="text-gray-600">Duration:</span>
                <span className="font-semibold">
                  {Math.round((new Date().getTime() - new Date(session.startedAt).getTime()) / 60000)} min
                </span>
              </div>
              {session.reservation && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Customer:</span>
                  <span className="font-semibold">{session.reservation.customerName}</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={onConfirm}
              disabled={isProcessing}
              className="w-full py-4 bg-green-600 text-white text-lg font-bold rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                'Processing...'
              ) : (
                <>✓ Confirm Payment Received - €{totalAmount.toFixed(2)}</>
              )}
            </button>
            <button
              onClick={onCancel}
              disabled={isProcessing}
              className="w-full py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>

          {/* Warning */}
          <div className="mt-4 text-xs text-gray-500 text-center">
            This will mark all orders as completed and close the table session
          </div>
        </div>
      </div>
    </div>
  );
}
