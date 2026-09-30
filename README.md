# 순서뽑기

조별 발표·게임·활동의 순서를 정하는 반응형 웹 서비스입니다. React + TypeScript + Vite, Tailwind CSS, shadcn/ui로 만들었습니다. 서버나 로그인 없이 브라우저에서 동작합니다.

## 사용 방법

1. 참여할 조 개수를 정합니다. 기본 6개 조이며 2~20개까지 설정할 수 있습니다.
2. **섞기**를 누르면 조 번호가 가려지고 3초 동안 카드가 모여 흔들립니다.
3. 섞기가 끝나면 카드를 눌러 개별 공개하거나 **전체 공개**로 한 번에 확인합니다.
4. 왼쪽 위부터 오른쪽으로 번호 순서대로 진행합니다. 공개가 끝나면 전체 결과를 복사할 수 있습니다.
5. **다시 섞기**로 새로운 순서를 정하거나 **처음으로**로 원래 조 순서로 돌아갑니다.

조 개수를 바꾸면 추첨은 초기화됩니다. 섞는 동안에는 조 개수 변경, 초기화, 카드 공개가 잠깁니다. 모바일에는 하단 고정 조작 버튼이 있습니다.

## 로컬 실행

Node.js 22.12 이상이 필요합니다. `.nvmrc`는 Node.js 22 계열을 사용합니다.

```bash
npm ci
npm run dev
```

화면은 http://localhost:5173 에서 열립니다. 같은 네트워크의 휴대폰에서는 터미널에 표시되는 Network 주소를 이용할 수 있습니다.

```bash
npm run build       # TypeScript 검사 + 프로덕션 빌드 (dist/)
npm run preview     # 빌드 결과 확인
npm run lint
npm test            # 추첨 알고리즘 테스트
npx playwright install chromium
npm run test:e2e    # 데스크톱/모바일 동작 및 레이아웃 검증
```

## Cloudflare Pages 배포

GitHub 저장소의 `main` 브랜치를 연결하고 아래 값을 설정합니다.

| 항목 | 값 |
| --- | --- |
| 프로덕션 분기 | `main` |
| 프레임워크 프리셋 | `React (Vite)` |
| 빌드 명령 | `npm run build` |
| 빌드 출력 디렉터리 | `dist` |
| 루트 디렉터리 | 비워 두기 (저장소 루트) |
| Node 버전 | `.nvmrc`의 `22` 사용. 필요하면 환경 변수 `NODE_VERSION=22` |

최초 커밋이 GitHub에 push되기 전에는 원격 브랜치가 없어 프로덕션 분기 목록이 비어 있을 수 있습니다. push한 뒤 설정 화면을 새로고침해 `main`을 선택하세요.

별도 API 키나 서버 설정은 필요하지 않습니다. 결과 복사는 HTTPS 또는 localhost에서 사용할 수 있으며, 브라우저에서 복사를 거부하면 화면에 안내합니다.

[Cloudflare Pages 공식 빌드 설정](https://developers.cloudflare.com/pages/configuration/build-configuration/)

## 추첨 방식과 접근성

- Web Crypto 난수와 Fisher–Yates 알고리즘으로 각 조를 한 번씩 배치합니다. 난수의 나머지 연산 편향은 rejection sampling으로 제거합니다.
- 각 순열의 확률은 같으므로 이전과 동일한 순서도 정상적으로 나올 수 있습니다.
- 숨겨진 조 번호는 화면 및 접근성 이름에 표시하지 않습니다. 순서는 브라우저 메모리에 있으며 보안이 필요한 추첨 용도는 아닙니다.
- 카드는 키보드 Enter/Space로 공개할 수 있고, 변경 상태는 스크린 리더에 전달합니다.
- 동작 줄이기 설정에서는 큰 이동 및 회전을 생략하되 3초 대기와 진행 상태는 유지합니다.
- 결과는 서버에 전송하거나 저장하지 않습니다. 새로고침하면 초기화됩니다.

## 주요 파일

- `src/App.tsx`: 설정, 카드 공개, 결과, 반응형 조작 UI
- `src/hooks/use-draw.ts`: 추첨 단계와 3초 타이머
- `src/lib/draw.ts`: 조 생성 및 랜덤 순열
- `src/components/ui/`: shadcn/ui 컴포넌트
- `src/index.css`: 스타일, 카드 뒤집기 및 섞기 애니메이션
- `e2e/draw.spec.ts`: 실제 브라우저 테스트
