import universalCookie from "https://cdn.jsdelivr.net/npm/universal-cookie@7.1.4/+esm";

export async function getTokenOrRefresh() {
  const cookie = new universalCookie();
  const speechToken = cookie.get("speech-token");

  if (speechToken === undefined) {
    try {
      const res = await axios.get("/api/get-speech-token");
      const token = res.data.token;
      const region = res.data.region;
      cookie.set("speech-token", region + ":" + token, {
        maxAge: 540,
        path: "/",
      });

      return { authToken: token, region: region };
    } catch (err) {
      console.log(err.response.data);
      return { authToken: null, error: err.response.data };
    }
  } else {
    const idx = speechToken.indexOf(":");
    return {
      authToken: speechToken.slice(idx + 1),
      region: speechToken.slice(0, idx),
    };
  }
}
