import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/db/prisma";
import { seedPermissions } from "./seedPermissions";
import { seedContent } from "./seedContent";
import fs from "fs";
import path from "path";

// ── Helpers ─────────────────────────────────────────────
const DATA_DIR = path.join(__dirname, "seedData");
const loadJson = <T>(filename: string): T =>
  JSON.parse(fs.readFileSync(path.join(DATA_DIR, filename), "utf-8")) as T;

// ── Types ────────────────────────────────────────────────
interface TeacherData {
  name: string;
  email: string;
  subjects: string[];
  address: string;
  dateOfBirth: string;
  sex: string;
  phoneNumber: string;
}
interface TopicData {
  name: string;
  subject: string;
  gradeNumber: number;
}
interface QuestionOption {
  label: string;
  text: string;
  isCorrect: boolean;
}
interface QuestionData {
  content: string;
  options: QuestionOption[];
  difficulty: "EASY" | "MEDIUM" | "HARD";
  subject: string;
  topic: string;
  gradeNumber: number;
  explanation?: string;
}

// ── Name generators ──────────────────────────────────────
const HO = [
  "Nguyễn",
  "Trần",
  "Lê",
  "Phạm",
  "Hoàng",
  "Vũ",
  "Đặng",
  "Bùi",
  "Ngô",
  "Lý",
  "Đinh",
  "Trịnh",
  "Phan",
  "Cao",
  "Dương",
  "Hồ",
  "Tô",
  "Lưu",
  "Mai",
  "Đỗ",
  "Võ",
  "Tạ",
  "Hà",
  "Kiều",
  "Nghiêm",
  "Chu",
  "Lã",
  "Thái",
  "Từ",
  "Mã",
];
const TEN_NAM = [
  "An",
  "Bảo",
  "Cường",
  "Dũng",
  "Đức",
  "Hải",
  "Hiếu",
  "Hùng",
  "Khải",
  "Lâm",
  "Long",
  "Minh",
  "Nam",
  "Nghĩa",
  "Phong",
  "Quân",
  "Sơn",
  "Thành",
  "Tiến",
  "Trọng",
  "Tú",
  "Uy",
  "Việt",
  "Yên",
  "Hưng",
  "Đạt",
  "Công",
  "Anh",
  "Tín",
  "Kiên",
];
const TEN_NU = [
  "Ánh",
  "Bình",
  "Cẩm",
  "Diệu",
  "Duyên",
  "Giang",
  "Hạnh",
  "Hồng",
  "Hương",
  "Kim",
  "Linh",
  "Ly",
  "My",
  "Nga",
  "Ngân",
  "Nhung",
  "Phương",
  "Quỳnh",
  "Tâm",
  "Thu",
  "Trang",
  "Trúc",
  "Tuyết",
  "Vân",
  "Xuân",
  "Yến",
  "Hiền",
  "Lan",
  "Ngọc",
  "Thủy",
];
const DEM_NAM = [
  "Văn",
  "Đình",
  "Hữu",
  "Quốc",
  "Minh",
  "Thanh",
  "Công",
  "Đức",
  "Bá",
  "Trung",
];
const DEM_NU = [
  "Thị",
  "Ngọc",
  "Bích",
  "Hương",
  "Kim",
  "Thu",
  "Thanh",
  "Lan",
  "Phương",
  "Hoài",
];

function genStudentName(i: number): { name: string; sex: "MALE" | "FEMALE" } {
  const isMale = i % 2 === 0;
  const ho = HO[i % HO.length];
  if (isMale) {
    return {
      name: `${ho} ${DEM_NAM[Math.floor(i / 2) % DEM_NAM.length]} ${TEN_NAM[Math.floor(i / 4) % TEN_NAM.length]}`,
      sex: "MALE",
    };
  }
  return {
    name: `${ho} ${DEM_NU[Math.floor(i / 2) % DEM_NU.length]} ${TEN_NU[Math.floor(i / 4) % TEN_NU.length]}`,
    sex: "FEMALE",
  };
}

const STREETS = [
  "Lê Lợi",
  "Nguyễn Huệ",
  "Đinh Tiên Hoàng",
  "Trần Hưng Đạo",
  "Nguyễn Trãi",
  "Hai Bà Trưng",
  "Lý Thường Kiệt",
  "Điện Biên Phủ",
  "Cách Mạng Tháng 8",
  "Lê Văn Sỹ",
  "Phạm Ngọc Thạch",
  "Nam Kỳ Khởi Nghĩa",
];
const DISTRICTS = [
  "Quận 1",
  "Quận 3",
  "Quận 5",
  "Quận 10",
  "Bình Thạnh",
  "Phú Nhuận",
];

function genAddress(i: number) {
  return `${(i % 99) + 1} ${STREETS[i % STREETS.length]}, ${DISTRICTS[i % DISTRICTS.length]}, TP.HCM`;
}
function genDob(gradeNumber: number, i: number): Date {
  const year = 2026 - (gradeNumber === 10 ? 16 : gradeNumber === 11 ? 17 : 18);
  return new Date(
    `${year}-${String((i % 12) + 1).padStart(2, "0")}-${String((i % 28) + 1).padStart(2, "0")}`,
  );
}

// ── Main ─────────────────────────────────────────────────
async function main() {
  console.log("🌱 Seeding database...\n");

  // 1. Subjects
  const subjectNames = [
    "Toán",
    "Vật lý",
    "Hóa học",
    "Sinh học",
    "Lịch sử",
    "Địa lý",
    "Tiếng Anh",
    "Ngữ văn",
  ];
  const subjects = await Promise.all(
    subjectNames.map((name) =>
      prisma.subject.upsert({ where: { name }, update: {}, create: { name } }),
    ),
  );
  const subjectMap = new Map(subjects.map((s) => [s.name, s]));
  console.log(`✅ ${subjects.length} môn học`);

  // 2. Grades
  const gradeData = [
    ...([1, 2, 3, 4, 5] as const).map((n) => ({
      level: "PRIMARY" as const,
      gradeNumber: n,
    })),
    ...([6, 7, 8, 9] as const).map((n) => ({
      level: "MIDDLE" as const,
      gradeNumber: n,
    })),
    ...([10, 11, 12] as const).map((n) => ({
      level: "HIGH" as const,
      gradeNumber: n,
    })),
  ];
  const grades = await Promise.all(
    gradeData.map((g) =>
      prisma.grade.upsert({
        where: {
          level_gradeNumber: { level: g.level, gradeNumber: g.gradeNumber },
        },
        update: {},
        create: g,
      }),
    ),
  );
  const gradeMap = new Map(grades.map((g) => [g.gradeNumber, g]));
  console.log(`✅ ${grades.length} khối lớp`);

  // 3. Passwords
  const [adminPw, teacherPw, studentPw] = await Promise.all([
    bcrypt.hash("ErwinRommel1102", 12),
    bcrypt.hash("Teacher123!", 12),
    bcrypt.hash("Student123!", 12),
  ]);

  // 4. Admin
  await prisma.user.upsert({
    where: { email: "quachhung389@gmail.com" },
    update: {},
    create: {
      name: "Quách Ngọc Hưng",
      email: "quachhung389@gmail.com",
      password: adminPw,
      role: "ADMIN",
      sex: "MALE",
      phoneNumber: "0900000000",
      address: "TP.HCM",
    },
  });

  // 5. Teachers
  const teachersJson = loadJson<TeacherData[]>("teachers.json");
  const teacherUsers = await Promise.all(
    teachersJson.map((t) =>
      prisma.user.upsert({
        where: { email: t.email },
        update: {},
        create: {
          name: t.name,
          email: t.email,
          password: teacherPw,
          role: "TEACHER",
          address: t.address,
          dateOfBirth: new Date(t.dateOfBirth),
          sex: t.sex,
          phoneNumber: t.phoneNumber,
        },
      }),
    ),
  );
  console.log(`✅ 1 admin, ${teacherUsers.length} giáo viên`);

  // 6. Students (40 học sinh demo cho trung tâm luyện thi)
  // Lớp học training center sẽ được tạo qua UI — không seed class ở đây.
  const STUDENT_COUNT = 40;
  let studentCount = 0;
  for (let gi = 0; gi < STUDENT_COUNT; gi++) {
    const email = `hs${String(gi + 1).padStart(4, "0")}@eduassess.vn`;
    const { name, sex } = genStudentName(gi);
    await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        name,
        email,
        password: studentPw,
        role: "STUDENT",
        sex,
        address: genAddress(gi),
        dateOfBirth: genDob(10 + (gi % 3), gi),
        phoneNumber: `09${String(gi).padStart(8, "0")}`.slice(0, 11),
      },
    });
    studentCount++;
  }
  console.log(`✅ ${studentCount} học sinh`);

  // 9. Topics
  const topicsJson = loadJson<TopicData[]>("topics.json");
  const upsertedTopics = await Promise.all(
    topicsJson.map(async (t) => {
      const subject = subjectMap.get(t.subject);
      const grade = gradeMap.get(t.gradeNumber);
      if (!subject || !grade) {
        console.warn(`⚠️  Bỏ qua topic: ${t.name}`);
        return null;
      }
      const ex = await prisma.topic.findFirst({
        where: { name: t.name, subjectId: subject.id, gradeId: grade.id },
      });
      return (
        ex ??
        (await prisma.topic.create({
          data: { name: t.name, subjectId: subject.id, gradeId: grade.id },
        }))
      );
    }),
  );
  const validTopics = upsertedTopics.filter(Boolean) as NonNullable<
    (typeof upsertedTopics)[0]
  >[];
  const topicMap = new Map(
    validTopics.map((t) => [`${t!.name}|${t!.subjectId}|${t!.gradeId}`, t!]),
  );
  console.log(`✅ ${validTopics.length} chủ đề`);

  // 10. Questions
  const defaultCreator = teacherUsers[0];
  const questionFiles = [
    "questions_math.json",
    "questions_physics.json",
    "questions_chemistry.json",
    "questions_bio.json",
  ];
  let qCreated = 0,
    qSkipped = 0;
  for (const file of questionFiles) {
    const fp = path.join(DATA_DIR, file);
    if (!fs.existsSync(fp)) {
      console.warn(`⚠️  Không tìm thấy: ${file}`);
      continue;
    }
    for (const q of loadJson<QuestionData[]>(file)) {
      const subject = subjectMap.get(q.subject);
      const grade = gradeMap.get(q.gradeNumber);
      if (!subject || !grade) continue;
      const topic = topicMap.get(`${q.topic}|${subject.id}|${grade.id}`);
      if (!topic) {
        console.warn(`⚠️  Topic không tồn tại: ${q.topic}`);
        continue;
      }
      const ex = await prisma.question.findFirst({
        where: { content: q.content, subjectId: subject.id },
      });
      if (ex) {
        qSkipped++;
        continue;
      }
      await prisma.question.create({
        data: {
          content: q.content,
          options: q.options as object[],
          difficulty: q.difficulty,
          status: "APPROVED",
          topicId: topic.id,
          subjectId: subject.id,
          createdById: defaultCreator.id,
          explanation: q.explanation ?? null,
        },
      });
      qCreated++;
    }
  }
  console.log(`✅ ${qCreated} câu hỏi mới (${qSkipped} đã tồn tại)`);

  // 11. Owner (NVCN — developer)
  const ownerPw = await bcrypt.hash("Owner123!", 12);
  await prisma.user.upsert({
    where: { email: "owner@eduassess.vn" },
    update: { role: "OWNER" },
    create: {
      name: "NVCN - System Owner",
      email: "owner@eduassess.vn",
      password: ownerPw,
      role: "OWNER",
      sex: "MALE",
      phoneNumber: "0900000001",
      address: "TP.HCM",
    },
  });
  console.log("✅ 1 owner (NVCN)");

  // 12. Staff (1 per position + 2 CBDT thuộc 1 CBDTS để demo hierarchy)
  const staffPw = await bcrypt.hash("Staff123!", 12);
  const staffSeeds: Array<{
    email: string;
    name: string;
    position: "NVSALE" | "NVLT" | "CBNK" | "CBDH" | "CBDT" | "CBDTS";
  }> = [
    { email: "nvsale1@eduassess.vn", name: "NV Tư vấn - Nguyễn Thị Sale",   position: "NVSALE" },
    { email: "nvlt1@eduassess.vn",   name: "NV Lễ tân - Trần Thị Lễ Tân",   position: "NVLT"   },
    { email: "cbnk1@eduassess.vn",   name: "CB Ngoại khoá - Lê Văn Khoá",   position: "CBNK"   },
    { email: "cbdh1@eduassess.vn",   name: "CB Du học - Phạm Thị Du",       position: "CBDH"   },
    { email: "cbdts1@eduassess.vn",  name: "CBDTS - Hoàng Văn Super",       position: "CBDTS"  },
    { email: "cbdt1@eduassess.vn",   name: "CBDT - Vũ Thị Đào Tạo 1",       position: "CBDT"   },
    { email: "cbdt2@eduassess.vn",   name: "CBDT - Đặng Văn Đào Tạo 2",     position: "CBDT"   },
  ];
  const staffUsers = await Promise.all(
    staffSeeds.map((s) =>
      prisma.user.upsert({
        where: { email: s.email },
        update: { role: "STAFF", staffPosition: s.position },
        create: {
          name: s.name,
          email: s.email,
          password: staffPw,
          role: "STAFF",
          staffPosition: s.position,
          address: "TP.HCM",
        },
      }),
    ),
  );
  // Hook CBDT → CBDTS supervisor
  const cbdts = staffUsers.find((u) => u.email === "cbdts1@eduassess.vn");
  if (cbdts) {
    await prisma.user.updateMany({
      where: {
        email: { in: ["cbdt1@eduassess.vn", "cbdt2@eduassess.vn"] },
      },
      data: { supervisorId: cbdts.id },
    });
  }
  console.log(`✅ ${staffUsers.length} nhân viên (NVSALE, NVLT, CBNK, CBDH, CBDTS, 2x CBDT)`);

  // 13. Parents (2 phụ huynh, mỗi người link với 2 học sinh đầu tiên)
  const parentPw = await bcrypt.hash("Parent123!", 12);
  const parentSeeds = [
    { email: "ph1@eduassess.vn", name: "PH - Nguyễn Văn Phụ Huynh 1" },
    { email: "ph2@eduassess.vn", name: "PH - Trần Thị Phụ Huynh 2" },
  ];
  const parentUsers = await Promise.all(
    parentSeeds.map((p) =>
      prisma.user.upsert({
        where: { email: p.email },
        update: { role: "PARENT" },
        create: {
          name: p.name,
          email: p.email,
          password: parentPw,
          role: "PARENT",
          address: "TP.HCM",
        },
      }),
    ),
  );

  // Link parent ↔ student (lấy 2 HS đầu)
  const firstTwoStudents = await prisma.user.findMany({
    where: { role: "STUDENT" },
    take: 2,
    orderBy: { email: "asc" },
  });
  for (let i = 0; i < parentUsers.length && i < firstTwoStudents.length; i++) {
    await prisma.parentStudent.upsert({
      where: {
        parentId_studentId: {
          parentId: parentUsers[i].id,
          studentId: firstTwoStudents[i].id,
        },
      },
      update: {},
      create: {
        parentId: parentUsers[i].id,
        studentId: firstTwoStudents[i].id,
        relation: i % 2 === 0 ? "FATHER" : "MOTHER",
        isPrimary: true,
      },
    });
  }
  console.log(`✅ ${parentUsers.length} phụ huynh + ${parentUsers.length} liên kết PH-HS`);

  // 14. Permission matrix
  const permStats = await seedPermissions(prisma);
  console.log(
    `✅ ${permStats.permissions} permission keys, ${permStats.rolePermissions} role bindings, ${permStats.positionPermissions} position bindings`,
  );

  // 15. Rooms & Booking Reasons
  const rooms = [
    { name: "Phòng 101 – Lớp lớn",  capacity: 20, description: "Phòng học rộng, bảng trắng lớn" },
    { name: "Phòng 102 – Lớp nhỏ",  capacity: 10, description: "Phòng học nhỏ, thích hợp kèm 1-1" },
    { name: "Phòng 201 – Lớp lớn",  capacity: 20, description: "Tầng 2, máy chiếu" },
    { name: "Phòng 202 – Hội thảo", capacity: 30, description: "Phòng họp lớn, âm thanh hội trường" },
    { name: "Phòng họp A",           capacity: 8,  description: "Phòng họp nhỏ nội bộ" },
  ];
  for (const r of rooms) {
    await prisma.room.upsert({ where: { name: r.name }, update: {}, create: r });
  }
  console.log(`✅ ${rooms.length} phòng`);

  const reasons = [
    { label: "Dạy học sinh (1-1)",           priority: 90 },
    { label: "Dạy lớp nhóm",                 priority: 85 },
    { label: "Gặp phụ huynh",               priority: 80 },
    { label: "Thi thử / Kiểm tra",          priority: 75 },
    { label: "Họp nội bộ",                  priority: 60 },
    { label: "Ngoại khoá / Sự kiện",        priority: 50 },
    { label: "Khác",                         priority: 10 },
  ];
  for (const reason of reasons) {
    await prisma.bookingReason.upsert({ where: { label: reason.label }, update: {}, create: reason });
  }
  console.log(`✅ ${reasons.length} lý do đặt phòng`);

  // 16. Nội dung demo: flashcard, khóa học, lớp học, đề KT, đánh giá năng lực
  console.log("\n📦 Seeding nội dung demo...");
  await seedContent();

  // Summary
  console.log("\n🎉 Seed hoàn tất!");
  console.log("─".repeat(60));
  console.log("  Owner     : owner@eduassess.vn           / Owner123!");
  console.log("  Admin     : quachhung389@gmail.com       / ErwinRommel1102");
  console.log("  Staff     : nvsale1 | nvlt1 | cbnk1 | cbdh1 | cbdts1 | cbdt1 | cbdt2 @eduassess.vn / Staff123!");
  console.log("  Giáo viên : gv.toan1@eduassess.vn        / Teacher123!");
  console.log("  Học sinh  : hs0001–hs0040@eduassess.vn   / Student123!");
  console.log("  Phụ huynh : ph1@eduassess.vn, ph2@...    / Parent123!");
  console.log("─".repeat(60));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
