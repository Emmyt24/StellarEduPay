const fetch = require("node-fetch");
const { logger } = require("../utils/logger");

/**
 * Send a payment webhook with retries (non-blocking)
 */
const sendPaymentWebhook = async (webhookUrl, payload, maxRetries = 3) => {
  if (!webhookUrl) return;

  (async () => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const body = await response.text();
          logger.error("[Webhook] Failed", {
            attempt,
            status: response.status,
            body,
          });
          if (attempt < maxRetries) {
            await new Promise((res) =>
              setTimeout(res, 100 * Math.pow(2, attempt))
            );
          }
        } else {
          logger.info("[Webhook] Triggered successfully", {
            paymentId: payload.paymentId,
          });
          break;
        }
      } catch (error) {
        logger.error("[Webhook] Error sending", {
          attempt,
          error: error.message,
        });
        if (attempt < maxRetries) {
          await new Promise((res) =>
            setTimeout(res, 100 * Math.pow(2, attempt))
          );
        }
      }
      ("use strict");

      const fetch = require("node-fetch");
      const { logger } = require("../utils/logger");

      /**
       * Send a payment webhook
       *
       * @param {string} webhookUrl - The endpoint to send the webhook to
       * @param {object} payload - The payload to send
       */
      const sendPaymentWebhook = async (webhookUrl, payload) => {
        if (!webhookUrl) {
          logger.warn("[Webhook] No URL provided, skipping webhook");
          return;
        }

        try {
          const response = await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            const text = await response.text();
            logger.error("[Webhook] Failed", {
              status: response.status,
              statusText: response.statusText,
              response: text,
              payload,
            });
          } else {
            logger.info("[Webhook] Successfully sent", { payload });
          }
        } catch (error) {
          logger.error("[Webhook] Error sending webhook", {
            error: error.message,
            payload,
          });
        }
      };

      module.exports = { sendPaymentWebhook };
    }
  })();
};

module.exports = { sendPaymentWebhook };
