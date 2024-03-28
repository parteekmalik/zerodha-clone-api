import { WS_method } from "../../utils/types";

export default function removeParams(type: WS_method, params: string[], { subscriptions, pendingSub }: { subscriptions: string[]; pendingSub: string[] }) {
    if (type === "SUBSCRIBE") {
        params = params.filter((item) => !subscriptions.includes(item) && !pendingSub.includes(item));
    } else {
        params = params.filter((item) => subscriptions.includes(item));
    }
    return params.map((item) => item.toLowerCase());
}
