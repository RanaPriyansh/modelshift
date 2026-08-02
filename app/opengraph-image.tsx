import { ImageResponse } from "next/og";

export const alt =
  "FORGE Semester Desk. Rebuild a broken university week from today.";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

const rows = [
  ["Biology 221", "Needs review", "#F0643B"],
  ["Physics 205 Lab", "Checked", "#173C29"],
  ["English 101", "Changed", "#123EAE"],
  ["History 204", "Checked", "#173C29"],
] as const;

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#F4F7F1",
          color: "#102019",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          padding: "54px 62px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "2px solid #173C29",
            paddingBottom: 22,
          }}
        >
          <div style={{ display: "flex", color: "#123EAE", fontSize: 28, fontWeight: 900 }}>
            FORGE
          </div>
          <div style={{ display: "flex", color: "#56645D", fontSize: 20 }}>
            Semester Desk for university students
          </div>
        </div>

        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            gap: 56,
            paddingTop: 42,
          }}
        >
          <div style={{ width: 470, display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                color: "#173C29",
                fontSize: 67,
                fontWeight: 850,
                letterSpacing: "-3.6px",
                lineHeight: 0.94,
              }}
            >
              Rebuild from today.
            </div>
            <div
              style={{
                display: "flex",
                marginTop: 26,
                color: "#56645D",
                fontSize: 25,
                lineHeight: 1.45,
              }}
            >
              See what changed. State real capacity. Choose the next honest action.
            </div>
          </div>

          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              border: "2px solid #173C29",
              background: "#FBFDF8",
              padding: "26px 28px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                borderBottom: "1px solid #CDD9D0",
                paddingBottom: 18,
              }}
            >
              <div style={{ display: "flex", fontSize: 26, fontWeight: 800 }}>
                Your semester
              </div>
              <div style={{ display: "flex", color: "#56645D", fontSize: 18 }}>
                4 hours available
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column" }}>
              {rows.map(([course, status, color]) => (
                <div
                  key={course}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderBottom: "1px solid #CDD9D0",
                    padding: "17px 0",
                  }}
                >
                  <div style={{ display: "flex", fontSize: 19, fontWeight: 700 }}>
                    {course}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 9,
                      color,
                      fontSize: 17,
                      fontWeight: 750,
                    }}
                  >
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        display: "flex",
                        borderRadius: 999,
                        background: color,
                      }}
                    />
                    {status}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
