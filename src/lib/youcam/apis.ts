// YouCam API endpoints, unit costs and response shapes, checked against docs.perfectcorp.com
// on 24 Oct 2026 (Hair Color on 27 Oct) and against real responses from the 26 Oct test run.

export const YOUCAM_BASE_URL = "https://yce-api-01.makeupar.com";

export type TaskApi = "hairstyle" | "haircolor" | "tone" | "hairtype";

export const TASK_APIS: Record<TaskApi, { path: string; units: number }> = {
  // Hair Style Try-On v2.1 with a custom reference photo (the wig)
  hairstyle: { path: "/s2s/v2.1/task/hair-transfer", units: 2 },
  // Hair Color Try-On v1.0, run on the stored try-on result to show the seller's colorways
  haircolor: { path: "/s2s/v2.0/task/hair-color", units: 1 },
  // Facial Color Tones Analyzer
  tone: { path: "/s2s/v2.0/task/skin-tone-analysis", units: 20 },
  // Hair Type Detection (three photos)
  hairtype: { path: "/s2s/v2.0/task/hair-type-detection", units: 2 },
};

export type FaceAngleStrictness = "strict" | "high" | "medium" | "low" | "flexible";

/** A colour as Hair Color takes it: "#rrggbb", with optional 0–100 intensities. */
export interface HairColorPalette {
  color: string;
  color_intensity?: number;
  shine_intensity?: number;
}

/**
 * Either one of YouCam's presets, or our own colours: one palette for the whole head ("full"),
 * or two for an ombre (top colour, then bottom). If both are sent, YouCam uses the preset.
 * Input limits: JPG or PNG under 10 MB, at least 320×320, face at least 100 px wide. The docs
 * disagree on the maximum ("long side < 1920" vs "width < 1920, height < 1080"): stay under both.
 */
export type HairColorSettings =
  | { preset: string }
  | { pattern: { name: "full" }; palettes: [HairColorPalette] }
  | {
      pattern: { name: "ombre"; blend_strength: number; line_offset: number; coloring_section: "top" };
      palettes: [top: HairColorPalette, bottom: HairColorPalette];
    };

export interface TaskBodies {
  hairstyle: { src_file_id: string; ref_file_id: string };
  haircolor: { src_file_id: string } & HairColorSettings;
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
  // Same 2-hour link as Hair Style.
  haircolor: { url: string };
  // face_quality is returned but not documented.
  tone: { color: SkinToneColors; face_quality?: Record<string, unknown> };
  hairtype: { hair_type: { mapping: string; term: string } };
}
