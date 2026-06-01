import { getTypeLabel } from "./courseDisplay";

const SHARE_COPY_SUCCESS_MESSAGE = "코스 링크가 클립보드에 복사되었습니다!";

export class ShareError extends Error {
  constructor(message) {
    super(message);
    this.name = "ShareError";
  }
}

export function getCourseShareId(course) {
  if (!course || course.source === "ors") return null;
  return course.courseId || course.id || null;
}

export function buildCourseShareUrl(courseId) {
  if (!courseId) {
    throw new ShareError("공유할 코스 ID를 확인하지 못했습니다.");
  }

  return new URL(
    `/detail/${encodeURIComponent(courseId)}`,
    window.location.origin,
  ).toString();
}

export function buildCourseSharePayload(course) {
  const courseId = getCourseShareId(course);
  const typeLabel = getTypeLabel(course?.type);
  const url = buildCourseShareUrl(courseId);

  return {
    title: `RWR 오늘의 추천 ${typeLabel} 코스`,
    text: `${course.title} 코스 어때요? 함께 걸어봐요!`,
    url,
  };
}

async function copyShareUrl(url) {
  if (!navigator.clipboard?.writeText) {
    throw new ShareError("이 브라우저에서는 공유 기능을 사용할 수 없습니다.");
  }

  await navigator.clipboard.writeText(url);
  return {
    method: "clipboard",
    message: SHARE_COPY_SUCCESS_MESSAGE,
  };
}

export async function shareCourse(course) {
  const payload = buildCourseSharePayload(course);

  if (navigator.share) {
    try {
      if (!navigator.canShare || navigator.canShare(payload)) {
        await navigator.share(payload);
        return {
          method: "native",
          message: "",
        };
      }
    } catch {
      // Web Share 취소/실패 시 클립보드 fallback으로 이어간다.
    }
  }

  return copyShareUrl(payload.url);
}
