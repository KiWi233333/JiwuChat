export function checkEmail(email: string): boolean {
  return /^[\w.%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(email);
};

export function checkPhone(phone: string): boolean {
  return /^(?:(?:\+|00)86)?1[3-9]\d{9}$/.test(phone);
}


export async function useWindowsVersion(): Promise<"Windows 10" | "Windows 11" | "Windows 8.1" | "Windows 8" | "Windows 7" | "Windows Vista" | "Windows XP" | null> {
  const userAgent = navigator.userAgent || navigator.appVersion;

  if (!userAgent.includes("Windows")) {
    return null; // 非 Windows 系统
  }

  // 基于 UA 判断 Windows 版本
  if (userAgent.includes("Windows NT 10.0")) {
    // Windows 10 或 11，需要进一步判断
    // Windows 11 和 10 在 UA 上大多数一致，除非 User-Agent 字串中包含额外提示
    // @ts-expect-error
    const uaData = navigator.userAgentData;
    if (uaData && uaData.platform === "Windows") {
      // 有些新版浏览器在 userAgentData 中区分得更清楚
      if ("getHighEntropyValues" in uaData) {
        const info = await uaData.getHighEntropyValues(["platformVersion"]);
        if (info.platformVersion) {
          // 通过 platformVersion 判断 Windows 10 或 11
          const v = Number.parseInt(info.platformVersion.split(".")[0] || "10");
          return `Windows ${v >= 13 ? 11 : 10}` as "Windows 10" | "Windows 11";
        }
      }
    }
    return null;
  }

  if (userAgent.includes("Windows NT 6.3"))
    return "Windows 8.1";
  if (userAgent.includes("Windows NT 6.2"))
    return "Windows 8";
  if (userAgent.includes("Windows NT 6.1"))
    return "Windows 7";
  if (userAgent.includes("Windows NT 6.0"))
    return "Windows Vista";
  if (userAgent.includes("Windows NT 5.1"))
    return "Windows XP";

  return null;
}
