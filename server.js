const express = require("express");
const multer = require("multer");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { v4: uuidv4 } = require("uuid");
const sharp = require("sharp");
require("dotenv").config();

const app = express();

// S3 Client setup
const s3 = new S3Client({ region: process.env.AWS_REGION || "us-east-1" });

// Multer configuration: store in memory, validate size and type
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter(req, file, cb) {
    if (!file.originalname.match(/\.(jpg|jpeg|png)$/i)) {
      return cb(new Error("Please upload an image (JPG/PNG)"));
    }
    cb(undefined, true);
  },
});

// Health check endpoint for NGINX/Load Balancer
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", message: "Server is running" });
});

// Upload endpoint
app.post("/upload", (req, res, next) => {
  upload.single("image")(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      // A Multer error occurred when uploading (e.g., file too large).
      return res.status(400).json({ error: err.message });
    } else if (err) {
      // An unknown error occurred (e.g., wrong file type).
      return res.status(400).json({ error: err.message });
    }
    // Everything went fine.
    next();
  });
}, async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Please provide an image file" });
  }

  try {
    // Bonus: Image resizing using sharp
    // Resize the image to a maximum of width 800px, maintaining aspect ratio
    const processedImageBuffer = await sharp(req.file.buffer)
      .resize({ width: 800, withoutEnlargement: true })
      .toBuffer();

    const fileName = `${uuidv4()}-${req.file.originalname}`;
    
    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: fileName,
      Body: processedImageBuffer,
      ContentType: req.file.mimetype,
    });

    await s3.send(command);
    
    // Construct the S3 URL
    const bucket = process.env.S3_BUCKET;
    const region = process.env.AWS_REGION || "us-east-1";
    const url = `https://${bucket}.s3.${region}.amazonaws.com/${fileName}`;
    
    console.log(`Request handled by worker running on port: ${process.env.PORT || 3000}`);
    
    res.status(200).json({ url });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: "Failed to upload image to S3", details: err.message });
  }
});

const PORT = process.env.PORT || 3000;

// Only start the server if we are not testing
if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => console.log(`Worker running on port ${PORT}`));
}

module.exports = app; // Export for testing
