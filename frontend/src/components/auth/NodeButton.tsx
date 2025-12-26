import { UiNode, UiNodeInputAttributes } from "@ory/client";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

interface NodeButtonProps {
    node: UiNode;
    attributes: UiNodeInputAttributes;
    isLoading: boolean;
    onClick?: () => void;
    onResend?: () => void;
    onMethodClick?: (value: string) => void;
}

export const NodeButton = ({ node, attributes, isLoading, onClick, onResend, onMethodClick }: NodeButtonProps) => {
    // 1. Calculate isResend immediately
    const labelText = node.meta.label?.text?.toLowerCase() || "";
    const isResend =
        (attributes.name === "method" && (attributes.value === "email" || attributes.value === "link")) ||
        labelText.includes("resend") ||
        labelText.includes("send code");

    // 2. Initialize timer state: auto-start at 60s if it's a Resend button
    const [timeLeft, setTimeLeft] = useState(isResend ? 60 : 0);

    useEffect(() => {
        if (isResend && timeLeft > 0) {
            const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
            return () => clearInterval(timer);
        }
    }, [timeLeft, isResend]);

    const handleClick = () => {
        // 3. Simplified Method Handling
        if (onMethodClick) {
            if (isResend) {
                // FORCE 'email' for any detected resend button
                onMethodClick("email");
            } else if (attributes.name === "method") {
                // Otherwise pass the actual attribute value (e.g. 'code')
                onMethodClick(String(attributes.value));
            }
        }

        // 4. Timer Reset Handling
        if (isResend) {
            if (timeLeft === 0) setTimeLeft(60);
            if (onResend) onResend();
        }

        if (onClick) onClick();
    };

    return (
        <Button
            type={isResend ? "button" : "submit"}
            disabled={isLoading || (isResend && timeLeft > 0)}
            name={attributes.name}
            value={attributes.value}
            onClick={handleClick}
            variant={attributes.value === "link" ? "link" : "default"}
            className="w-full"
            formNoValidate={isResend}
        >
            {isResend && timeLeft > 0
                ? `Resend available in ${timeLeft}s`
                : node.meta.label?.text}
        </Button>
    );
};
