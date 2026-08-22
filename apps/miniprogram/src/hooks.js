import { useCallback, useEffect, useState } from "react";
import Taro, { usePullDownRefresh } from "@tarojs/taro";
import { errorText } from "./api";

export function useRemote(loader, fallback) {
  const [data, setData] = useState(fallback);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setData(await loader()); }
    catch (reason) { setError(errorText(reason)); }
    finally { setLoading(false); Taro.stopPullDownRefresh(); }
  }, [loader]);
  useEffect(() => { load(); }, [load]);
  usePullDownRefresh(load);
  return { data, loading, error, reload: load };
}
