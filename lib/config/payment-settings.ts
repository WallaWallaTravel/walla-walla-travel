export interface PaymentSettings {
  passFeesToCustomer: boolean;
  allowCustomerToToggleFees: boolean;
  defaultTipPercentage: number;
}

export const PAYMENT_SETTINGS: PaymentSettings = {
  passFeesToCustomer: true,
  allowCustomerToToggleFees: false,
  defaultTipPercentage: 0.20,
};
