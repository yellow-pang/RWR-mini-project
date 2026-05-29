import { useEffect, useState } from "react";
import { ApiError, getFriendlyErrorMessage } from "../api/client";
import {
  addFavorite,
  fetchFavorites,
  removeFavorite,
} from "../api/favorites";
import { getUserId } from "../utils/userId";

export function useFavoriteStatus(courseId) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [message, setMessage] = useState("");
  const [noticeMessage, setNoticeMessage] = useState("");

  useEffect(() => {
    if (!courseId) return;

    async function loadFavoriteState() {
      try {
        const response = await fetchFavorites(getUserId());
        setIsFavorite(response.data.some((item) => item.courseId === courseId));
      } catch {
        setIsFavorite(false);
      }
    }

    loadFavoriteState();
  }, [courseId]);

  async function toggleFavorite() {
    if (!courseId) return;

    try {
      setMessage("");
      setNoticeMessage("");
      const userId = getUserId();

      if (isFavorite) {
        await removeFavorite(userId, courseId);
        setIsFavorite(false);
      } else {
        await addFavorite(userId, courseId);
        setIsFavorite(true);
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setIsFavorite(true);
        setNoticeMessage("이미 즐겨찾기에 저장된 코스입니다.");
        return;
      }

      setMessage(
        getFriendlyErrorMessage(err, "즐겨찾기 상태를 변경하지 못했습니다."),
      );
    }
  }

  return {
    isFavorite,
    setIsFavorite,
    message,
    setMessage,
    noticeMessage,
    setNoticeMessage,
    toggleFavorite,
  };
}
