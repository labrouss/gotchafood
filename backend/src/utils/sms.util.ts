// Utility to send SMS notifications
// In a real app, you would integrate Twilio, Vonage, or AWS SNS here.

export const sendDeliverySMS = async (phone: string, orderId: string) => {
  if (!phone) return false;

  const apiKey = process.env.TEXTBEE_API_KEY;
  const deviceId = process.env.TEXTBEE_DEVICE_ID;

  if (!apiKey || !deviceId) {
    console.warn('[SMS] TextBee API Key or Device ID missing. SMS skipped.');
    console.log(`[SMS MOCK] Sending SMS to ${phone}: Your order #${orderId} is now OUT FOR DELIVERY!`);
    return true;
  }

  try {
    const response = await fetch(`https://api.textbee.dev/api/v1/gateway/devices/${deviceId}/send-sms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        recipients: [phone],
        message: `Your order #${orderId} is now OUT FOR DELIVERY! 🚚`,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('TextBee SMS failed:', errorData);
      return false;
    }

    const data = await response.json();
    console.log('TextBee SMS sent successfully:', data);
    return true;
  } catch (error) {
    console.error('Error sending TextBee SMS:', error);
    return false;
  }
};

export const sendTierUpgradeSMS = async (phone: string, tier: string, bonusPoints: number) => {
  if (!phone) return false;

  const apiKey = process.env.TEXTBEE_API_KEY;
  const deviceId = process.env.TEXTBEE_DEVICE_ID;

  const message = `Congratulations! You reached ${tier.toUpperCase()} tier! 🏆 You've earned ${bonusPoints} bonus points!`;

  if (!apiKey || !deviceId) {
    console.warn('[SMS] TextBee API Key or Device ID missing. SMS skipped.');
    console.log(`[SMS MOCK] Sending SMS to ${phone}: ${message}`);
    return true;
  }

  try {
    const response = await fetch(`https://api.textbee.dev/api/v1/gateway/devices/${deviceId}/send-sms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        recipients: [phone],
        message: message,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('TextBee SMS failed:', errorData);
      return false;
    }

    const data = await response.json();
    console.log('TextBee SMS sent successfully:', data);
    return true;
  } catch (error) {
    console.error('Error sending TextBee SMS:', error);
    return false;
  }
};
