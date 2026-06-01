const POSTCODE_SCRIPT_SRC =
  "https://t1.kakaocdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";

let postcodeScriptPromise = null;

export function loadPostcodeScript() {
  if (window.kakao?.Postcode) {
    return Promise.resolve(window.kakao.Postcode);
  }

  if (postcodeScriptPromise) {
    return postcodeScriptPromise;
  }

  postcodeScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = POSTCODE_SCRIPT_SRC;
    script.async = true;
    script.onload = () => {
      if (window.kakao?.Postcode) {
        resolve(window.kakao.Postcode);
        return;
      }
      reject(new Error("우편번호 서비스를 초기화하지 못했습니다."));
    };
    script.onerror = () => {
      postcodeScriptPromise = null;
      reject(new Error("우편번호 서비스를 불러오지 못했습니다."));
    };
    document.head.appendChild(script);
  });

  return postcodeScriptPromise;
}

export function getSelectedPostcodeAddress(data) {
  if (data.userSelectedType === "R") {
    return data.roadAddress || data.address || data.jibunAddress;
  }

  return data.jibunAddress || data.address || data.roadAddress;
}
