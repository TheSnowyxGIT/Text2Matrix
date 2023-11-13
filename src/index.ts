import { Font } from "./font";

export * from "./font";
export * from "./text";

export function getFileHash(input: string | ArrayBuffer): Promise<string> {
  return new Promise(async (resolve, reject) => {
    const encHex = require("crypto-js/enc-hex");
    const SHA256 = require("crypto-js/sha256");

    if (typeof input !== "string") {
      const byteArray = new Uint8Array(input);
      let hexString = "";
      byteArray.forEach((byte) => {
        hexString += byte.toString(16).padStart(2, "0");
      });
      resolve(SHA256(encHex.parse(hexString)).toString());
    } else {
      if (typeof window === "undefined") {
        const fs = require("fs") as typeof import("fs");
        try {
          const fileBuffer = fs.readFileSync(input);
          const byteArray = new Uint8Array(fileBuffer.buffer);
          let hexString = "";
          byteArray.forEach((byte) => {
            hexString += byte.toString(16).padStart(2, "0");
          });
          resolve(SHA256(encHex.parse(hexString)).toString());
        } catch (err) {
          reject(new Error(`Error reading the file: ${err}`));
        }
      } else {
        reject(
          new Error(
            "File hashing from path is not supported in the browser environment"
          )
        );
      }
    }
  });
}
