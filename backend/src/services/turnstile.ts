export class TurnstileValidator {
    private secretKey: string;
    private timeout: number;

    constructor(secretKey: string = process.env.TURNSTILE_SECRET_KEY || "", timeout: number = 10000) {
        this.secretKey = secretKey;
        this.timeout = timeout;
    }

    async validate(token: string, remoteip?: string, options: { expectedAction?: string, expectedHostname?: string, idempotencyKey?: string } = {}): Promise<any> {
        // Input validation
        if (!token || typeof token !== "string") {
            return { success: false, error: "Invalid token format" };
        }

        if (token.length > 2048) {
            return { success: false, error: "Token too long" };
        }

        // Prepare request
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            const formData = new FormData();
            formData.append("secret", this.secretKey);
            formData.append("response", token);

            if (remoteip) {
                formData.append("remoteip", remoteip);
            }

            if (options.idempotencyKey) {
                formData.append("idempotency_key", options.idempotencyKey);
            }

            const response = await fetch(
                "https://challenges.cloudflare.com/turnstile/v0/siteverify",
                {
                    method: "POST",
                    body: formData,
                    signal: controller.signal,
                },
            );

            const result = await response.json();

            // Additional validation
            if (result.success) {
                if (
                    options.expectedAction &&
                    result.action !== options.expectedAction
                ) {
                    return {
                        success: false,
                        error: "Action mismatch",
                        expected: options.expectedAction,
                        received: result.action,
                    };
                }

                if (
                    options.expectedHostname &&
                    result.hostname !== options.expectedHostname
                ) {
                    return {
                        success: false,
                        error: "Hostname mismatch",
                        expected: options.expectedHostname,
                        received: result.hostname,
                    };
                }
            }

            return result;
        } catch (error: any) {
            if (error.name === "AbortError") {
                return { success: false, error: "Validation timeout" };
            }

            console.error("Turnstile validation error:", error);
            return { success: false, error: "Internal error" };
        } finally {
            clearTimeout(timeoutId);
        }
    }
}
