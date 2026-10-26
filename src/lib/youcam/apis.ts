// YouCam API endpoints, unit costs and response shapes, checked against docs.perfectcorp.com
// on 24 Oct 2026 and against real responses from the 26 Oct test run.

export const YOUCAM_BASE_URL = "https://yce-api-01.makeupar.com";

export type TaskApi = "hairstyle" | "tone" | "hairtype";

export const TASK_APIS: Record<TaskApi, { path: string; units: number }> = {
  // Hair Style Try-On v2.1 with a custom reference photo (the wig)
  hairstyle: { path: "/s2s/v2.1/task/hair-transfer", units: 2 },
  // Facial Color Tones Analyzer
  tone: { path: "/s2s/v2.0/task/skin-tone-analysis", units: 20 },
  // Hair Type Detection (three photos)
  hairtype: { path: "/s2s/v2.0/task/hair-type-detection", units: 2 },
};

export type FaceAngleStrictness = "strict" | "high" | "medium" | "low" | "flexible";

export interface TaskBodies {
  hairstyle: { src_file_id: string; ref_file_id: string };
  tone: { src_file_id: string; face_angle_strictness_level?: FaceAngleStrictness };
  // Order matters: front, right, left.
  hairtype: { src_file_ids: [front: string, right: string, left: string] };
}

export interface SkinToneColors {
  skin_color: string;
  hair_color?: string;
  hair_color_name?: string;
  eye_color?: string;
  eye_color_name?: string;
  lip_color?: string;
  eyebrow_color?: string;
}

export interface TaskResults {
  // The result URL expires after 2 hours: copy the image straight away.
  hairstyle: { url: string };
  // face_quality is returned but not documented.
  tone: { color: SkinToneColors; face_quality?: Record<string, unknown> };
  hairtype: { hair_type: { mapping: string; term: string } };
}
