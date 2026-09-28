// Online payment: opens Paystack's secure window on the page.
// channel "bank_transfer" → Paystack shows a one-time account number; the
// customer sends the money from their bank app and Paystack confirms it
// automatically. Money settles to the bank account on your Paystack dashboard.
import { client, api } from "./core.js";

let scriptPromise;
function loadPaystack() {
  scriptPromise ??= new Promise((resolve, reject) => {
    if (window.PaystackPop) return resolve(window.PaystackPop);
    const s = document.createElement("script");
    s.src = "https://js.paystack.co/v2/inline.js";
    s.onload = () => resolve(window.PaystackPop);
    s.onerror = () => { scriptPromise = null; reject(new Error("Couldn't load Paystack")); };
    document.head.append(s);
  });
  return scriptPromise;
}

/**
 * Start payment for an order. Resolves to "paid" | "cancelled".
 * Throws with a readable message if payment can't start.
 */
export async function startPayment({ code, phone, total, channel = "bank_transfer" }) {

  const init = await client.action(api.paystack.initialize, { code, phone, channel });
  if (init.error) throw new Error(init.error);

  let PaystackPop;
  try { PaystackPop = await loadPaystack(); }
  catch { location.href = init.url; return new Promise(() => {}); } // fallback: Paystack's hosted page

  return new Promise((resolve, reject) => {
    new PaystackPop().resumeTransaction(init.accessCode, {
      onSuccess: async (tx) => {
        // Never trust the browser: confirm with Paystack from the server
        await client.action(api.paystack.verify, { reference: tx.reference ?? init.reference }).catch(() => false);
        resolve("paid");
      },
      onCancel: () => resolve("cancelled"),
      onError: (e) => reject(new Error(e?.message ?? "Payment failed. Try again.")),
    });
  });
}
