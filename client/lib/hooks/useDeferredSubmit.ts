"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * 아직 결과를 세는 중이면 다 세고 나서 보낸다.
 *
 * 검색창에서 엔터는 곧바로 답할 수 없는 부탁이다. 입력이 멈춘 뒤에야 요청이
 * 나가므로, 치자마자 누르면 결과가 몇 개인지 아직 모른다. 막지도 말고 빈 목록으로
 * 보내지도 않으려면 그 사이를 누군가 들고 있어야 한다. 이 훅이 그 자리다.
 *
 * `ready` 가 오면 세기가 끝난 것이고, 그때 `onReady` 가 그 결과를 보고 정한다.
 * 기다리는 사이 검색어가 바뀌면 마지막 검색어의 결과를 따르게 되고,
 * `cancel` 을 부르면 없던 일이 된다.
 */
export const useDeferredSubmit = (ready: boolean, onReady: () => void) => {
  const [waiting, setWaiting] = useState(false);

  /**
   * 부탁을 들어준 뒤에는 기다림을 접어야 한다. 다만 그 접는 일을 effect 안에서
   * 하면 다시 그리기가 꼬리를 문다. 대신 이미 들어준 부탁인지를 ref 로 적어 두고,
   * 기다림은 다음에 값이 바뀔 때 자연스럽게 접힌다.
   */
  const done = useRef(false);

  useEffect(() => {
    if (!waiting || !ready || done.current) return;

    done.current = true;
    onReady();
  }, [waiting, ready, onReady]);

  const submit = useCallback(() => {
    done.current = false;
    setWaiting(true);
  }, []);

  const cancel = useCallback(() => {
    done.current = true;
    setWaiting(false);
  }, []);

  return { waiting: waiting && !ready, submit, cancel };
};
