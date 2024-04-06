import { $Enums } from "@prisma/client";

export default function lowUpp(type: $Enums.OrderType, triggerType: $Enums.EtriggerType) {
    return type === "BUY" ? (triggerType === "LIMIT" ? "LOWER" : "UPPER") : triggerType === "STOP" ? "UPPER" : "LOWER";
}