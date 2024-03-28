export default function updateSubsctription(list: string[]) {
    const res = list.map((i) => i.slice(0, i.length - 6).toUpperCase() + "@trade");
    console.log("this._subscriptions -> ", res);
    return res;
}
