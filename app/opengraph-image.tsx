import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          height: "100%",
          width: "100%",
          background:
            "radial-gradient(circle at top left, #173356 0%, #09111f 40%, #050914 100%)",
          color: "#f6f8fc",
          padding: "56px",
          position: "relative",
          overflow: "hidden",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 48,
            right: 52,
            width: 240,
            height: 240,
            borderRadius: 9999,
            background: "rgba(143, 246, 178, 0.18)",
            filter: "blur(8px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -60,
            left: -40,
            width: 320,
            height: 320,
            borderRadius: 9999,
            background: "rgba(86, 161, 255, 0.16)",
          }}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
            borderRadius: 36,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.05)",
            padding: "42px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 18,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 64,
                height: 64,
                borderRadius: 20,
                background: "rgba(255,255,255,0.12)",
                fontSize: 30,
                fontWeight: 700,
              }}
            >
              K
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <div style={{ fontSize: 34, fontWeight: 700 }}>Keepalive</div>
              <div
                style={{
                  fontSize: 20,
                  letterSpacing: "0.28em",
                  textTransform: "uppercase",
                  color: "rgba(246,248,252,0.58)",
                }}
              >
                iMessage-native agent
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 28,
              maxWidth: 880,
            }}
          >
            <div
              style={{
                fontSize: 74,
                lineHeight: 0.94,
                fontWeight: 700,
                letterSpacing: "-0.06em",
              }}
            >
              It remembers the second message.
            </div>
            <div
              style={{
                display: "flex",
                maxWidth: 860,
                fontSize: 28,
                lineHeight: 1.45,
                color: "rgba(246,248,252,0.72)",
              }}
            >
              An iMessage agent built with Photon that remembers who matters,
              what you promised, and when to follow up.
            </div>
          </div>
        </div>
      </div>
    ),
    size
  );
}
