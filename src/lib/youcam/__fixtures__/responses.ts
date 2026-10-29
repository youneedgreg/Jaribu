// YouCam responses for tests. No images, no real file or task ids, no faces.
// "live" = copied from the 26 Oct test run (synthetic faces), ids replaced.
// "docs" = shape from docs.perfectcorp.com, because the live run didn't produce one.

// docs
export const credit = {
  status: 200,
  results: [
    { id: 1, type: "ApiSubsToken", amount: 900, amount_dec: 900.5, expiry: 1798761600000 },
    { id: 2, type: "ApiPaygToken", amount: 54, amount_dec: 53.5, expiry: 1798761600000 },
  ],
};

// docs
export const fileUpload = {
  status: 200,
  data: {
    files: [
      {
        content_type: "image/jpg",
        file_name: "front.jpg",
        file_id: "file-123",
        requests: [
          {
            method: "PUT",
            url: "https://upload.example.test/front?sig=abc",
            headers: { "Content-Length": "4", "Content-Type": "image/jpg" },
          },
        ],
      },
    ],
  },
};

export const taskStarted = { status: 200, data: { task_id: "task-123" } };

export const taskRunning = { status: 200, data: { task_status: "running" } };

// live (result URL replaced)
export const hairstyleSuccess = {
  status: 200,
  data: { task_status: "success", error: null, results: { url: "https://results.example.test/tryon.jpg" } },
};

// docs: Hair Color returns one result link, like Hair Style (no live run yet)
export const hairColorSuccess = {
  status: 200,
  data: { task_status: "success", error: null, results: { url: "https://results.example.test/colorway.jpg" } },
};

// docs: error codes from the Hair Color page
export const hairColorError = {
  status: 200,
  data: {
    task_status: "error",
    error: "error_below_min_image_size",
    error_message: "the size of the source image is smaller than minimum (expect: width >= 320px, height >= 320px)",
  },
};

// live
export const toneSuccess = {
  status: 200,
  data: {
    task_status: "success",
    error: null,
    results: {
      color: {
        eye_color: "#120f0b",
        eye_color_name: "Brown",
        lip_color: "#6e4d49",
        eyebrow_color: "#3e3834",
        skin_color: "#614633",
        hair_color: "#B56637",
        hair_color_name: "Auburn",
      },
      face_quality: { has_face: true, area: "good", frontal: "good", lighting: "good", faceangle: "good" },
    },
  },
};

// live: short natural hair, box braids (misread as wavy), long straight
export const hairTypeSuccess = (mapping: string, term: string) => ({
  status: 200,
  data: { task_status: "success", error: null, results: { hair_type: { mapping, term } } },
});

// docs: error codes from the Hair Style page
export const hairstyleError = {
  status: 200,
  data: { task_status: "error", error: "error_hair_too_short", error_message: "Input hair is too short" },
};

// docs
export const invalidKey = { status: 401, error: "Unauthorized", error_code: "InvalidAccessToken" };
