export default function FormatSubsctriptionParams(list: string[]) {
    const res = list.map((i) => i.slice(0, i.length - 6).toUpperCase());
    console.log("this._subscriptions -> ", res);
    return res;
}
