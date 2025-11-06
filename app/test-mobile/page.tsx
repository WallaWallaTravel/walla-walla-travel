'use client';

import { MobileButton } from '@/components/mobile';
import { MobileInput } from '@/components/ui/mobile-input';
import { MobileToggle, CompactToggle, ToggleGroup, ToggleListItem } from '@/components/ui/mobile-toggle';
import { MobileSelect, Checkbox, RadioGroup } from '@/components/ui/mobile-select';
import { useState } from 'react';

export default function TestMobilePage() {
  const [lastAction, setLastAction] = useState<string>('None');
  const [counter, setCounter] = useState(0);

  // Input field states
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [emailError, setEmailError] = useState('');

  // Toggle states
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [airplaneMode, setAirplaneMode] = useState(false);
  const [autoSave, setAutoSave] = useState(true);

  // Select states
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedTime, setSelectedTime] = useState('morning');

  // Checkbox states
  const [terms, setTerms] = useState(false);
  const [newsletter, setNewsletter] = useState(false);
  const [sms, setSms] = useState(true);

  // Radio states
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [shippingSpeed, setShippingSpeed] = useState('standard');

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          MobileButton Component Test
        </h1>

        {/* Status Display - Sticky at top */}
        <div className="sticky top-0 z-50 bg-white rounded-lg shadow-lg p-6 mb-6 border-2 border-blue-500">
          <h2 className="text-xl font-bold text-gray-900 mb-2">📊 Live Status</h2>
          <p className="text-gray-700">
            <strong>Last Action:</strong> {lastAction}
          </p>
          <p className="text-gray-700">
            <strong>Counter:</strong> {counter}
          </p>
          <p className="text-gray-700">
            <strong>Notifications:</strong> {notificationsEnabled ? '🔔 ON' : '🔕 OFF'}
          </p>
        </div>

        {/* Button Tests */}
        <div className="space-y-6">
          {/* Primary Variants */}
          <section className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Primary Buttons</h2>
            <div className="space-y-3">
              <MobileButton
                variant="primary"
                onClick={() => {
                  setLastAction('Primary clicked');
                  setCounter(c => c + 1);
                }}
              >
                Primary Button
              </MobileButton>

              <MobileButton
                variant="primary"
                size="sm"
                onClick={() => setLastAction('Primary Small clicked')}
              >
                Primary Small
              </MobileButton>

              <MobileButton
                variant="primary"
                fullWidth
                onClick={() => setLastAction('Primary Full Width clicked')}
              >
                Primary Full Width
              </MobileButton>

              <MobileButton
                variant="primary"
                disabled
                onClick={() => setLastAction('This should not fire')}
              >
                Primary Disabled
              </MobileButton>

              <MobileButton
                variant="primary"
                loading
                onClick={() => setLastAction('Loading...')}
              >
                Primary Loading
              </MobileButton>
            </div>
          </section>

          {/* Secondary Variants */}
          <section className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Secondary Buttons</h2>
            <div className="space-y-3">
              <MobileButton
                variant="secondary"
                onClick={() => setLastAction('Secondary clicked')}
              >
                Secondary Button
              </MobileButton>

              <MobileButton
                variant="secondary"
                size="sm"
                onClick={() => setLastAction('Secondary Small clicked')}
              >
                Secondary Small
              </MobileButton>
            </div>
          </section>

          {/* Danger Variants */}
          <section className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Danger Buttons</h2>
            <div className="space-y-3">
              <MobileButton
                variant="danger"
                onClick={() => setLastAction('Danger clicked')}
              >
                Danger Button
              </MobileButton>

              <MobileButton
                variant="danger"
                fullWidth
                onClick={() => {
                  if (confirm('Are you sure?')) {
                    setLastAction('Danger confirmed');
                    setCounter(0);
                  }
                }}
              >
                Reset Counter (Danger)
              </MobileButton>
            </div>
          </section>

          {/* Ghost Variants */}
          <section className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Ghost Buttons</h2>
            <div className="space-y-3">
              <MobileButton
                variant="ghost"
                onClick={() => setLastAction('Ghost clicked')}
              >
                Ghost Button
              </MobileButton>

              <MobileButton
                variant="ghost"
                size="sm"
                onClick={() => setLastAction('Ghost Small clicked')}
              >
                Ghost Small
              </MobileButton>
            </div>
          </section>

          {/* With Icons (using emoji for now) */}
          <section className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Buttons with Icons</h2>
            <div className="space-y-3">
              <MobileButton
                variant="primary"
                onClick={() => setLastAction('Plus clicked')}
              >
                ➕ Add Item
              </MobileButton>

              <MobileButton
                variant="secondary"
                onClick={() => setLastAction('Edit clicked')}
              >
                ✏️ Edit
              </MobileButton>

              <MobileButton
                variant="danger"
                onClick={() => setLastAction('Delete clicked')}
              >
                🗑️ Delete
              </MobileButton>
            </div>
          </section>

          {/* Action Buttons */}
          <section className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Practical Examples</h2>
            <div className="space-y-3">
              <MobileButton
                variant="primary"
                fullWidth
                onClick={() => setLastAction('Save clicked')}
              >
                💾 Save Changes
              </MobileButton>

              <div className="grid grid-cols-2 gap-3">
                <MobileButton
                  variant="secondary"
                  onClick={() => setLastAction('Cancel clicked')}
                >
                  Cancel
                </MobileButton>
                <MobileButton
                  variant="primary"
                  onClick={() => setLastAction('Confirm clicked')}
                >
                  Confirm
                </MobileButton>
              </div>
            </div>
          </section>

          {/* Input Fields Section */}
          <section className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">MobileInput Component</h2>
            <div className="space-y-4">
              {/* Basic Input */}
              <MobileInput
                label="Email Address"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setLastAction(`Email changed: ${e.target.value}`);
                  if (emailError) setEmailError('');
                }}
                error={emailError}
                helperText="We'll never share your email"
                fullWidth
              />

              {/* Required Input */}
              <MobileInput
                label="Phone Number"
                type="tel"
                placeholder="(555) 123-4567"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setLastAction(`Phone changed: ${e.target.value}`);
                }}
                required
                helperText="Required for booking confirmations"
                fullWidth
              />

              {/* Input with Error State */}
              <MobileInput
                label="Test Error State"
                type="text"
                placeholder="Type 'error' to trigger"
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value);
                }}
                error={notes === 'error' ? 'Invalid input detected!' : ''}
                fullWidth
              />

              {/* Disabled Input */}
              <MobileInput
                label="Booking ID"
                type="text"
                value="WW-12345"
                disabled
                helperText="This field cannot be edited"
                fullWidth
              />

              {/* Validation Example */}
              <div className="pt-4 border-t">
                <h3 className="text-lg font-bold text-gray-900 mb-3">Input Validation Example</h3>
                <MobileInput
                  label="Email (with validation)"
                  type="email"
                  placeholder="test@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  error={emailError}
                  fullWidth
                />
                <div className="mt-3">
                  <MobileButton
                    variant="primary"
                    fullWidth
                    onClick={() => {
                      if (!email) {
                        setEmailError('Email is required');
                      } else if (!/\S+@\S+\.\S+/.test(email)) {
                        setEmailError('Please enter a valid email address');
                      } else {
                        setEmailError('');
                        setLastAction(`Valid email submitted: ${email}`);
                      }
                    }}
                  >
                    Validate Email
                  </MobileButton>
                </div>
              </div>
            </div>
          </section>

          {/* Form Example */}
          <section className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Complete Form Example</h2>
            <div className="space-y-4">
              <MobileInput
                label="Full Name"
                type="text"
                placeholder="John Doe"
                required
                fullWidth
              />
              <MobileInput
                label="Email"
                type="email"
                placeholder="john@example.com"
                required
                helperText="For booking confirmation"
                fullWidth
              />
              <MobileInput
                label="Phone"
                type="tel"
                placeholder="(555) 123-4567"
                required
                fullWidth
              />
              <div className="pt-2">
                <MobileButton
                  variant="primary"
                  fullWidth
                  onClick={() => setLastAction('Form submitted')}
                >
                  Submit Booking
                </MobileButton>
              </div>
            </div>
          </section>

          {/* Toggle Switches Section */}
          <section className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">MobileToggle Component</h2>
            <div className="space-y-4">
              {/* Basic Toggle */}
              <MobileToggle
                checked={notificationsEnabled}
                onChange={(checked) => {
                  console.log('🔔 Basic Toggle - onChange called:', checked);
                  console.log('🔔 Current state before update:', notificationsEnabled);
                  setNotificationsEnabled(checked);
                  setLastAction(`Notifications: ${checked ? 'ON' : 'OFF'}`);
                }}
                label="Push Notifications"
                description="Receive alerts for new bookings"
              />

              {/* Compact Toggle */}
              <div className="pt-4 border-t">
                <h3 className="text-base font-bold text-gray-900 mb-3">Compact Variant</h3>
                <CompactToggle
                  checked={darkMode}
                  onChange={(checked) => {
                    setDarkMode(checked);
                    setLastAction(`Dark Mode: ${checked ? 'ON' : 'OFF'}`);
                  }}
                  label="Dark Mode"
                />
              </div>

              {/* Toggle Group */}
              <div className="pt-4 border-t">
                <h3 className="text-base font-bold text-gray-900 mb-3">Toggle Group</h3>
                <ToggleGroup title="Settings">
                  <ToggleListItem
                    icon="📢"
                    checked={notificationsEnabled}
                    onChange={(checked) => {
                      console.log('📢 ToggleGroup - onChange called:', checked);
                      console.log('📢 Current state before update:', notificationsEnabled);
                      setNotificationsEnabled(checked);
                      setLastAction(`Notifications (Group): ${checked ? 'ON' : 'OFF'}`);
                    }}
                    label="Notifications"
                    description="Get alerts for important updates"
                  />
                  <ToggleListItem
                    icon="✈️"
                    checked={airplaneMode}
                    onChange={(checked) => {
                      setAirplaneMode(checked);
                      setLastAction(`Airplane Mode: ${checked ? 'ON' : 'OFF'}`);
                    }}
                    label="Airplane Mode"
                    description="Disable all network connections"
                  />
                  <ToggleListItem
                    icon="💾"
                    checked={autoSave}
                    onChange={(checked) => {
                      setAutoSave(checked);
                      setLastAction(`Auto-save: ${checked ? 'ON' : 'OFF'}`);
                    }}
                    label="Auto-save"
                    description="Automatically save changes"
                    divider={false}
                  />
                </ToggleGroup>
              </div>
            </div>
          </section>

          {/* Select/Dropdown Section */}
          <section className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">MobileSelect Component</h2>
            <div className="space-y-4">
              {/* Basic Select */}
              <MobileSelect
                label="Select City"
                options={[
                  { value: 'ww', label: 'Walla Walla' },
                  { value: 'seattle', label: 'Seattle' },
                  { value: 'portland', label: 'Portland' },
                  { value: 'spokane', label: 'Spokane' }
                ]}
                value={selectedCity}
                onChange={(value) => {
                  setSelectedCity(value);
                  setLastAction(`City selected: ${value}`);
                }}
                placeholder="Choose a city"
                helperText="Select your tour location"
                fullWidth
              />

              {/* Select with Default Value */}
              <MobileSelect
                label="Preferred Time"
                options={[
                  { value: 'morning', label: 'Morning (9AM - 12PM)' },
                  { value: 'afternoon', label: 'Afternoon (1PM - 4PM)' },
                  { value: 'evening', label: 'Evening (5PM - 8PM)' }
                ]}
                value={selectedTime}
                onChange={(value) => {
                  setSelectedTime(value);
                  setLastAction(`Time selected: ${value}`);
                }}
                fullWidth
              />
            </div>
          </section>

          {/* Checkbox Section */}
          <section className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Checkbox Component</h2>
            <div className="space-y-2">
              <Checkbox
                checked={terms}
                onChange={(checked) => {
                  setTerms(checked);
                  setLastAction(`Terms accepted: ${checked}`);
                }}
                label="I agree to the terms and conditions"
                description="Required to complete booking"
              />

              <Checkbox
                checked={newsletter}
                onChange={(checked) => {
                  setNewsletter(checked);
                  setLastAction(`Newsletter: ${checked ? 'subscribed' : 'unsubscribed'}`);
                }}
                label="Subscribe to newsletter"
                description="Get updates about new tours and special offers"
              />

              <Checkbox
                checked={sms}
                onChange={(checked) => {
                  setSms(checked);
                  setLastAction(`SMS notifications: ${checked ? 'enabled' : 'disabled'}`);
                }}
                label="Receive SMS updates"
                description="Get text messages for booking confirmations"
              />
            </div>
          </section>

          {/* Radio Group Section */}
          <section className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">RadioGroup Component</h2>
            <div className="space-y-6">
              {/* Payment Method */}
              <RadioGroup
                name="payment"
                label="Payment Method"
                options={[
                  {
                    value: 'card',
                    label: 'Credit Card',
                    description: 'Pay with Visa, Mastercard, or Amex'
                  },
                  {
                    value: 'paypal',
                    label: 'PayPal',
                    description: 'Use your PayPal account'
                  },
                  {
                    value: 'cash',
                    label: 'Cash',
                    description: 'Pay driver directly (subject to availability)'
                  }
                ]}
                value={paymentMethod}
                onChange={(value) => {
                  setPaymentMethod(value);
                  setLastAction(`Payment method: ${value}`);
                }}
              />

              {/* Shipping Speed */}
              <RadioGroup
                name="shipping"
                label="Shipping Speed"
                options={[
                  {
                    value: 'standard',
                    label: 'Standard (5-7 days)',
                    description: 'Free shipping'
                  },
                  {
                    value: 'express',
                    label: 'Express (2-3 days)',
                    description: '$15 additional'
                  },
                  {
                    value: 'overnight',
                    label: 'Overnight',
                    description: '$35 additional'
                  }
                ]}
                value={shippingSpeed}
                onChange={(value) => {
                  setShippingSpeed(value);
                  setLastAction(`Shipping: ${value}`);
                }}
              />
            </div>
          </section>

          {/* BottomNav Note */}
          <section className="bg-yellow-50 rounded-lg shadow-md p-6 border-2 border-yellow-300">
            <h2 className="text-xl font-bold text-gray-900 mb-2">📱 BottomNav Component</h2>
            <p className="text-gray-700 mb-3">
              The BottomNav component is designed for app-level navigation and should be added to your layout file, not individual pages.
            </p>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <p className="text-sm font-mono text-gray-800">
                Example usage in layout.tsx:
              </p>
              <pre className="mt-2 text-xs bg-gray-50 p-3 rounded overflow-x-auto">
{`<BottomNav
  items={[
    { label: 'Home', icon: '🏠', href: '/' },
    { label: 'Bookings', icon: '📅', href: '/bookings', badge: 3 },
    { label: 'Profile', icon: '👤', href: '/profile' }
  ]}
/>`}
              </pre>
            </div>
          </section>
        </div>

        {/* Notes */}
        <div className="mt-6 bg-blue-50 rounded-lg p-6 border-2 border-blue-200">
          <h3 className="text-lg font-bold text-blue-900 mb-2">
            📱 Mobile-Optimized Features
          </h3>
          <div className="space-y-3">
            <div>
              <h4 className="font-bold text-blue-900 mb-1">MobileButton:</h4>
              <ul className="list-disc list-inside text-blue-800 space-y-1 ml-2">
                <li>48px minimum touch target (WCAG compliant)</li>
                <li>Haptic feedback on touch devices</li>
                <li>Active state feedback</li>
                <li>Loading state with spinner</li>
                <li>Disabled state handling</li>
                <li>Full width option for mobile layouts</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-blue-900 mb-1">MobileInput:</h4>
              <ul className="list-disc list-inside text-blue-800 space-y-1 ml-2">
                <li>56px minimum touch target (WCAG compliant)</li>
                <li>Clear visual error states with icons</li>
                <li>Helper text for guidance</li>
                <li>Required field indicators</li>
                <li>Full TypeScript support with ref forwarding</li>
                <li>Accessible label-input association</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-blue-900 mb-1">MobileToggle:</h4>
              <ul className="list-disc list-inside text-blue-800 space-y-1 ml-2">
                <li>48-56px touch targets (WCAG compliant)</li>
                <li>Smooth animations and transitions</li>
                <li>Haptic feedback on interaction</li>
                <li>Compact variant for inline use</li>
                <li>Group and list item variants</li>
                <li>Clear on/off visual states</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-blue-900 mb-1">MobileSelect, Checkbox, RadioGroup:</h4>
              <ul className="list-disc list-inside text-blue-800 space-y-1 ml-2">
                <li>56px minimum touch targets (WCAG compliant)</li>
                <li>Custom styled dropdowns</li>
                <li>Checkbox and radio with descriptions</li>
                <li>Clear selected states</li>
                <li>Haptic feedback</li>
                <li>Full keyboard navigation</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-blue-900 mb-1">BottomNav:</h4>
              <ul className="list-disc list-inside text-blue-800 space-y-1 ml-2">
                <li>Fixed bottom navigation</li>
                <li>Badge support for notifications</li>
                <li>Active state highlighting</li>
                <li>Safe area support for notched devices</li>
                <li>Smooth transitions</li>
                <li>Add to layout file for app-wide navigation</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
