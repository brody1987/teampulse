import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { teams, members, projects, tasks, evaluations, activityLog } from "../src/lib/schema";
import { sql } from "drizzle-orm";

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
const db = drizzle(client);

async function seed() {
  // Check if already seeded
  const [teamCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(teams);
  if (teamCount.count > 0) {
    console.log("Database already has data, skipping seed.");
    await client.end();
    return;
  }

  console.log("Seeding database...");

  // Seed teams
  const seedTeams = [
    { name: "콘텐츠제작팀", description: "콘텐츠 기획 및 제작", color: "#3B82F6" },
    { name: "크리에이터팀", description: "크리에이터 관리 및 협업", color: "#8B5CF6" },
    { name: "CX브랜딩팀", description: "고객 경험 및 브랜딩", color: "#EC4899" },
    { name: "D2C팀", description: "Direct to Consumer 채널 운영", color: "#F59E0B" },
    { name: "WAYDN팀", description: "WAYDN 서비스 운영", color: "#10B981" },
  ];
  const insertedTeams = await db.insert(teams).values(seedTeams).returning();

  // Seed members
  const seedMembers = [
    { name: "김민수", role: "콘텐츠 디렉터", teamId: insertedTeams[0].id, position: "팀장", email: "minsu@example.com" },
    { name: "이서연", role: "영상 에디터", teamId: insertedTeams[0].id, position: "선임", email: "seoyeon@example.com" },
    { name: "박준혁", role: "카피라이터", teamId: insertedTeams[0].id, position: "주임", email: "junhyuk@example.com" },
    { name: "정다은", role: "크리에이터 매니저", teamId: insertedTeams[1].id, position: "팀장", email: "daeun@example.com" },
    { name: "최우진", role: "파트너십 담당", teamId: insertedTeams[1].id, position: "선임", email: "woojin@example.com" },
    { name: "한소미", role: "브랜드 매니저", teamId: insertedTeams[2].id, position: "팀장", email: "somi@example.com" },
    { name: "강태윤", role: "UX 디자이너", teamId: insertedTeams[2].id, position: "선임", email: "taeyoon@example.com" },
    { name: "윤서현", role: "CX 전략가", teamId: insertedTeams[2].id, position: "주임", email: "seohyun@example.com" },
    { name: "임재호", role: "이커머스 매니저", teamId: insertedTeams[3].id, position: "팀장", email: "jaeho@example.com" },
    { name: "오지민", role: "MD", teamId: insertedTeams[3].id, position: "선임", email: "jimin@example.com" },
    { name: "송현우", role: "서비스 기획자", teamId: insertedTeams[4].id, position: "팀장", email: "hyunwoo@example.com" },
    { name: "배수아", role: "프로덕트 디자이너", teamId: insertedTeams[4].id, position: "선임", email: "sua@example.com" },
  ];
  const insertedMembers = await db.insert(members).values(seedMembers).returning();

  // Seed projects
  const seedProjects = [
    { name: "2026 봄 캠페인 콘텐츠", description: "봄 시즌 마케팅 콘텐츠 제작", teamId: insertedTeams[0].id, status: "active" as const, startDate: "2026-02-01", endDate: "2026-04-30" },
    { name: "유튜브 채널 리뉴얼", description: "브랜드 유튜브 채널 리뉴얼 프로젝트", teamId: insertedTeams[0].id, status: "active" as const, startDate: "2026-01-15", endDate: "2026-03-31" },
    { name: "인플루언서 협업 프로그램", description: "Q1 크리에이터 협업", teamId: insertedTeams[1].id, status: "active" as const, startDate: "2026-01-01", endDate: "2026-03-31" },
    { name: "브랜드 리뉴얼", description: "CX 중심 브랜드 아이덴티티 재정립", teamId: insertedTeams[2].id, status: "active" as const, startDate: "2026-01-01", endDate: "2026-06-30" },
    { name: "자사몰 개편", description: "D2C 자사몰 UX 개편", teamId: insertedTeams[3].id, status: "active" as const, startDate: "2026-02-01", endDate: "2026-05-31" },
    { name: "WAYDN 앱 v2.0", description: "WAYDN 앱 메이저 업데이트", teamId: insertedTeams[4].id, status: "active" as const, startDate: "2026-01-15", endDate: "2026-04-30" },
  ];
  const insertedProjects = await db.insert(projects).values(seedProjects).returning();

  // Seed tasks
  const seedTasks = [
    { title: "캠페인 컨셉 기획", description: "봄 캠페인 메인 컨셉 및 방향성 수립", projectId: insertedProjects[0].id, assigneeId: insertedMembers[0].id, status: "완료" as const, priority: "높음" as const, dueDate: "2026-02-15", sortOrder: 0 },
    { title: "촬영 스케줄 수립", description: "모델/장소/일정 확정", projectId: insertedProjects[0].id, assigneeId: insertedMembers[1].id, status: "진행중" as const, priority: "높음" as const, dueDate: "2026-02-28", sortOrder: 1 },
    { title: "카피 초안 작성", description: "캠페인 메인/서브 카피 작성", projectId: insertedProjects[0].id, assigneeId: insertedMembers[2].id, status: "진행중" as const, priority: "보통" as const, dueDate: "2026-03-05", sortOrder: 2 },
    { title: "영상 편집", description: "캠페인 티저 영상 편집", projectId: insertedProjects[0].id, assigneeId: insertedMembers[1].id, status: "대기" as const, priority: "보통" as const, dueDate: "2026-03-15", sortOrder: 3 },
    { title: "채널 분석 리포트", description: "현재 채널 성과 분석", projectId: insertedProjects[1].id, assigneeId: insertedMembers[0].id, status: "완료" as const, priority: "높음" as const, dueDate: "2026-02-01", sortOrder: 0 },
    { title: "썸네일 가이드라인", description: "새 썸네일 디자인 가이드 수립", projectId: insertedProjects[1].id, assigneeId: insertedMembers[1].id, status: "검토중" as const, priority: "보통" as const, dueDate: "2026-02-20", sortOrder: 1 },
    { title: "크리에이터 섭외", description: "Q1 협업 크리에이터 리스트업 및 섭외", projectId: insertedProjects[2].id, assigneeId: insertedMembers[3].id, status: "진행중" as const, priority: "긴급" as const, dueDate: "2026-02-28", sortOrder: 0 },
    { title: "계약서 작성", description: "협업 계약 조건 정리", projectId: insertedProjects[2].id, assigneeId: insertedMembers[4].id, status: "대기" as const, priority: "높음" as const, dueDate: "2026-03-10", sortOrder: 1 },
    { title: "브랜드 감사", description: "현행 브랜드 자산 전수 조사", projectId: insertedProjects[3].id, assigneeId: insertedMembers[5].id, status: "완료" as const, priority: "높음" as const, dueDate: "2026-02-15", sortOrder: 0 },
    { title: "고객 리서치", description: "FGI 및 설문 진행", projectId: insertedProjects[3].id, assigneeId: insertedMembers[7].id, status: "진행중" as const, priority: "높음" as const, dueDate: "2026-03-15", sortOrder: 1 },
    { title: "디자인 시스템 구축", description: "새 브랜드 디자인 시스템", projectId: insertedProjects[3].id, assigneeId: insertedMembers[6].id, status: "대기" as const, priority: "보통" as const, dueDate: "2026-04-15", sortOrder: 2 },
    { title: "UX 감사", description: "자사몰 현행 UX 분석", projectId: insertedProjects[4].id, assigneeId: insertedMembers[8].id, status: "완료" as const, priority: "높음" as const, dueDate: "2026-02-20", sortOrder: 0 },
    { title: "와이어프레임 설계", description: "개편 페이지 와이어프레임", projectId: insertedProjects[4].id, assigneeId: insertedMembers[9].id, status: "진행중" as const, priority: "높음" as const, dueDate: "2026-03-10", sortOrder: 1 },
    { title: "앱 기획서 작성", description: "v2.0 기능 명세 및 기획서", projectId: insertedProjects[5].id, assigneeId: insertedMembers[10].id, status: "진행중" as const, priority: "긴급" as const, dueDate: "2026-02-28", sortOrder: 0 },
    { title: "UI 디자인", description: "v2.0 주요 화면 디자인", projectId: insertedProjects[5].id, assigneeId: insertedMembers[11].id, status: "대기" as const, priority: "높음" as const, dueDate: "2026-03-20", sortOrder: 1 },
  ];
  const insertedTasks = await db.insert(tasks).values(seedTasks).returning();

  // Seed evaluations
  await db.insert(evaluations).values([
    { taskId: insertedTasks[0].id, memberId: insertedMembers[0].id, quality: 9, timeliness: 8, creativity: 8, collaboration: 9, comment: "체계적인 컨셉 기획으로 캠페인 방향성을 잘 잡았습니다." },
    { taskId: insertedTasks[4].id, memberId: insertedMembers[0].id, quality: 8, timeliness: 9, creativity: 7, collaboration: 8, comment: "데이터 기반의 꼼꼼한 분석 리포트였습니다." },
    { taskId: insertedTasks[8].id, memberId: insertedMembers[5].id, quality: 9, timeliness: 7, creativity: 8, collaboration: 9, comment: "전수 조사를 통해 브랜드 자산을 체계적으로 정리했습니다." },
    { taskId: insertedTasks[11].id, memberId: insertedMembers[8].id, quality: 8, timeliness: 8, creativity: 7, collaboration: 8, comment: "현행 UX의 문제점을 정확히 파악했습니다." },
  ]);

  // Seed activity log
  await db.insert(activityLog).values([
    { type: "create", entityType: "project", entityId: insertedProjects[0].id, description: "프로젝트 '2026 봄 캠페인 콘텐츠' 생성" },
    { type: "complete", entityType: "task", entityId: insertedTasks[0].id, description: "업무 '캠페인 컨셉 기획' 완료" },
    { type: "create", entityType: "project", entityId: insertedProjects[2].id, description: "프로젝트 '인플루언서 협업 프로그램' 생성" },
    { type: "evaluate", entityType: "task", entityId: insertedTasks[0].id, description: "업무 '캠페인 컨셉 기획' 평가 완료" },
  ]);

  console.log("Seed complete!");
  await client.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
