import PaymentForm from '@/components/PaymentForm';

export default function PaymentTestPage() {
  const PASS_FEES_TO_CUSTOMER = true;
  const ALLOW_CUSTOMER_TOGGLE = false;

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Complete Your Payment</h1>
          <p className="text-gray-600 mb-8">Secure payment processing</p>
          
          <PaymentForm 
            bookingNumber="WWT-2025-00001" 
            baseAmount={1190.40} 
            depositAmount={595.20} 
            isDeposit={true}
            passFeesToCustomer={PASS_FEES_TO_CUSTOMER}
            allowFeeToggle={ALLOW_CUSTOMER_TOGGLE}
          />
        </div>

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-3">Test Cards</h3>
          <p className="text-sm text-blue-800"><strong>Success:</strong> 4242 4242 4242 4242</p>
        </div>

        <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="font-semibold text-yellow-900 mb-2">Admin Settings</h4>
          <p className="text-sm text-yellow-800">
            Pass Fees: {PASS_FEES_TO_CUSTOMER ? 'Yes' : 'No'} | Allow Toggle: {ALLOW_CUSTOMER_TOGGLE ? 'Yes' : 'No'}
          </p>
        </div>
      </div>
    </div>
  );
}
