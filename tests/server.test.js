const request = require("supertest");
const app = require("../server");

// Mock AWS S3 to prevent real uploads during tests
jest.mock("@aws-sdk/client-s3", () => {
  return {
    S3Client: jest.fn(() => ({
      send: jest.fn().mockResolvedValue({}),
    })),
    PutObjectCommand: jest.fn(),
  };
});

describe("Image Upload Server API", () => {
  it("should return 200 OK for the health check", async () => {
    const res = await request(app).get("/health");
    expect(res.statusCode).toEqual(200);
    expect(res.body.status).toEqual("ok");
  });

  it("should reject a file that is not an image", async () => {
    const res = await request(app)
      .post("/upload")
      .attach("image", Buffer.from("this is a text file"), "test.txt");
    
    expect(res.statusCode).toEqual(400);
    expect(res.body.error).toContain("Please upload an image (JPG/PNG)");
  });

  it("should reject an upload if no file is provided", async () => {
    const res = await request(app).post("/upload");
    
    expect(res.statusCode).toEqual(400);
    expect(res.body.error).toEqual("Please provide an image file");
  });

  it("should successfully upload a valid image", async () => {
    // Create a dummy valid image (1x1 pixel PNG)
    const pngBuffer = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
    
    const res = await request(app)
      .post("/upload")
      .attach("image", pngBuffer, "test.png");
    
    expect(res.statusCode).toEqual(200);
    expect(res.body.url).toBeDefined();
    expect(res.body.url).toContain("amazonaws.com");
  });
});
