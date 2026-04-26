import axios from "axios";
import crypto from "crypto";

interface CloudinaryUploadResult {
  secure_url?: string;
}

const getCloudinaryConfig = () => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim() ?? "";
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim() ?? "";
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim() ?? "";

  const missing: string[] = [];
  if (!cloudName) {
    missing.push("CLOUDINARY_CLOUD_NAME");
  }
  if (!apiKey) {
    missing.push("CLOUDINARY_API_KEY");
  }
  if (!apiSecret) {
    missing.push("CLOUDINARY_API_SECRET");
  }

  return {
    cloudName,
    apiKey,
    apiSecret,
    missing,
  };
};

export const uploadProfileImageToCloudinary = async (
  dataUri: string,
): Promise<string> => {
  const config = getCloudinaryConfig();
  if (config.missing.length) {
    throw new Error(`CLOUDINARY_CONFIG_MISSING: ${config.missing.join(",")}`);
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = "ahar/profile";
  const signatureBase = `folder=${folder}&timestamp=${timestamp}${config.apiSecret}`;
  const signature = crypto
    .createHash("sha1")
    .update(signatureBase)
    .digest("hex");

  const body = new URLSearchParams();
  body.append("file", dataUri);
  body.append("api_key", config.apiKey);
  body.append("timestamp", String(timestamp));
  body.append("signature", signature);
  body.append("folder", folder);

  const response = await axios.post<CloudinaryUploadResult>(
    `https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`,
    body.toString(),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      timeout: 20_000,
    },
  );

  const secureUrl = response.data.secure_url;
  if (!secureUrl) {
    throw new Error("CLOUDINARY_UPLOAD_FAILED");
  }

  return secureUrl;
};

export default uploadProfileImageToCloudinary;
