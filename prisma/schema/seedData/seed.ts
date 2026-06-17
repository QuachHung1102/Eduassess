import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../../../lib/db/prisma";
import fs from "fs";
import path from "path";

// ── Helpers ─────────────────────────────────────────────
const DATA_DIR = __dirname;
const loadJson = <T>(filename: string): T =>
  JSON.parse(fs.readFileSync(path.join(DATA_DIR, filename), "utf-8")) as T;

// ── Types ────────────────────────────────────────────────
interface TeacherData {
  name: string; email: string; subjects: string[];
  address: string; dateOfBirth: string; sex: string; phoneNumber: string;
}
interface TopicData     { name: string; subject: string; gradeNumber: number }
interface QuestionOption { label: string; text: string; isCorrect: boolean }
interface QuestionData {
  content: string; options: QuestionOption[];
  difficulty: "EASY" | "MEDIUM" | "HARD";
  subject: string; topic: string; gradeNumber: number; explanation?: string;
}

// ── Name generators ──────────────────────────────────────
const HO = ["Nguyễn","Trần","Lê","Phạm","Hoàng","Vũ","Đặng","Bùi","Ngô","Lý",
             "Đinh","Trịnh","Phan","Cao","Dương","Hồ","Tô","Lưu","Mai","Đỗ",
             "Võ","Tạ","Hà","Kiều","Nghiêm","Chu","Lã","Thái","Từ","Mã"];
const TEN_NAM = ["An","Bảo","Cường","Dũng","Đức","Hải","Hiếu","Hùng","Khải","Lâm",
                  "Long","Minh","Nam","Nghĩa","Phong","Quân","Sơn","Thành","Tiến","Trọng",
                  "Tú","Uy","Việt","Yên","Hưng","Đạt","Công","Anh","Tín","Kiên"];
const TEN_NU  = ["Ánh","Bình","Cẩm","Diệu","Duyên","Giang","Hạnh","Hồng","Hương","Kim",
                  "Linh","Ly","My","Nga","Ngân","Nhung","Phương","Quỳnh","Tâm","Thu",
                  "Trang","Trúc","Tuyết","Vân","Xuân","Yến","Hiền","Lan","Ngọc","Thủy"];
const DEM_NAM = ["Văn","Đình","Hữu","Quốc","Minh","Thanh","Công","Đức","Bá","Trung"];
const DEM_NU  = ["Thị","Ngọc","Bích","Hương","Kim","Thu","Thanh","Lan","Phương","Hoài"];

function genStudentName(i: number): { name: string; sex: "MALE" | "FEMALE" } {
  const isMale = i % 2 === 0;
  const ho  = HO[i % HO.length];
  if (isMale) {
    return { name: `${ho} ${DEM_NAM[Math.floor(i/2)%DEM_NAM.length]} ${TEN_NAM[Math.floor(i/4)%TEN_NAM.length]}`, sex: "MALE" };
  }
  return { name: `${ho} ${DEM_NU[Math.floor(i/2)%DEM_NU.length]} ${TEN_NU[Math.floor(i/4)%TEN_NU.length]}`, sex: "FEMALE" };
}

const STREETS  = ["Lê Lợi","Nguyễn Huệ","Đinh Tiên Hoàng","Trần Hưng Đạo",
                   "Nguyễn Trãi","Hai Bà Trưng","Lý Thường Kiệt","Điện Biên Phủ",
                   "Cách Mạng Tháng 8","Lê Văn Sỹ","Phạm Ngọc Thạch","Nam Kỳ Khởi Nghĩa"];
const DISTRICTS = ["Quận 1","Quận 3","Quận 5","Quận 10","Bình Thạnh","Phú Nhuận"];

function genAddress(i: number) {
  return `${(i % 99) + 1} ${STREETS[i % STREETS.length]}, ${DISTRICTS[i % DISTRICTS.length]}, TP.HCM`;
}
function genDob(gradeNumber: number, i: number): Date {
  const year = 2026 - (gradeNumber === 10 ? 16 : gradeNumber === 11 ? 17 : 18);
  return new Date(`${year}-${String((i % 12) + 1).padStart(2,"0")}-${String((i % 28) + 1).padStart(2,"0")}`);
}

// ── Main ─────────────────────────────────────────────────
async function main() {
  console.log("🌱 Seeding database...\n");

  // 1. Subjects
  const subjectNames = ["Toán","Vật lý","Hóa học","Sinh học","Lịch sử","Địa lý","Tiếng Anh","Ngữ văn"];
  const subjects = await Promise.all(
    subjectNames.map((name) => prisma.subject.upsert({ where: { name }, update: {}, create: { name } }))
  );
  const subjectMap = new Map(subjects.map((s) => [s.name, s]));
  console.log(`✅ ${subjects.length} môn học`);

  // 2. Grades
  const gradeData = [
    ...([1,2,3,4,5] as const).map((n) => ({ level: "PRIMARY" as const, gradeNumber: n })),
    ...([6,7,8,9]   as const).map((n) => ({ level: "MIDDLE"  as const, gradeNumber: n })),
    ...([10,11,12]  as const).map((n) => ({ level: "HIGH"    as const, gradeNumber: n })),
  ];
  const grades = await Promise.all(
    gradeData.map((g) =>
      prisma.grade.upsert({
        where: { level_gradeNumber: { level: g.level, gradeNumber: g.gradeNumber } },
        update: {}, create: g,
      })
    )
  );
  const gradeMap = new Map(grades.map((g) => [g.gradeNumber, g]));
  console.log(`✅ ${grades.length} khối lớp`);

  // 3. Passwords
  const [adminPw, teacherPw, studentPw] = await Promise.all([
    bcrypt.hash("Admin123!", 12),
    bcrypt.hash("Teacher123!", 12),
    bcrypt.hash("Student123!", 12),
  ]);

  // 4. Admin
  await prisma.user.upsert({
    where:  { email: "admin@eduassess.vn" },
    update: {},
    create: { name: "Quản trị viên", email: "admin@eduassess.vn",
              password: adminPw, role: "ADMIN", sex: "MALE",
              phoneNumber: "0900000000", address: "TP.HCM" },
  });

  // 5. Teachers
  const teachersJson = loadJson<TeacherData[]>("teachers.json");
  const teacherUsers = await Promise.all(
    teachersJson.map((t) =>
      prisma.user.upsert({
        where:  { email: t.email },
        update: {},
        create: { name: t.name, email: t.email, password: teacherPw, role: "TEACHER",
                  address: t.address, dateOfBirth: new Date(t.dateOfBirth),
                  sex: t.sex, phoneNumber: t.phoneNumber },
      })
    )
  );
  const teacherMap = new Map(teacherUsers.map((t) => [t.email, t]));
  console.log(`✅ 1 admin, ${teacherUsers.length} giáo viên`);

  // Build subjectName → teacher email list
  const subjectTeacherEmails = new Map<string, string[]>();
  for (const t of teachersJson) {
    for (const subj of t.subjects) {
      if (!subjectTeacherEmails.has(subj)) subjectTeacherEmails.set(subj, []);
      subjectTeacherEmails.get(subj)!.push(t.email);
    }
  }

  // 6. Classes (36 lớp: 12 per grade)
  const HIGH_GRADES = [10, 11, 12];
  const SUFFIXES    = ["A1","A2","A3","A4","A5","A6","A7","A8","A9","A10","A11","A12"];
  const allClassDefs = HIGH_GRADES.flatMap((g) => SUFFIXES.map((s) => ({ name: `${g}${s}`, gradeNumber: g })));

  const upsertedClasses: { id: string; name: string; gradeId: string }[] = [];
  for (const c of allClassDefs) {
    const grade = gradeMap.get(c.gradeNumber)!;
    const existing = await prisma.class.findFirst({ where: { name: c.name, gradeId: grade.id } });
    upsertedClasses.push(existing ?? await prisma.class.create({ data: { name: c.name, gradeId: grade.id } }));
  }
  const classMap = new Map(upsertedClasses.map((c) => [c.name, c]));
  console.log(`✅ ${upsertedClasses.length} lớp học`);

  // 7. TeacherClass (round-robin per subject)
  let tcCount = 0;
  for (const subjectName of subjectNames) {
    const subject = subjectMap.get(subjectName);
    const emails  = subjectTeacherEmails.get(subjectName) ?? [];
    if (!subject || emails.length === 0) continue;
    for (let i = 0; i < upsertedClasses.length; i++) {
      const cls     = upsertedClasses[i];
      const teacher = teacherMap.get(emails[i % emails.length]);
      if (!teacher) continue;
      await prisma.teacherClass.upsert({
        where: { teacherId_classId_subjectId: { teacherId: teacher.id, classId: cls.id, subjectId: subject.id } },
        update: {},
        create: { teacherId: teacher.id, classId: cls.id, subjectId: subject.id },
      });
      tcCount++;
    }
  }
  console.log(`✅ ${tcCount} phân công giảng dạy`);

  // 8. Students + StudentClass (30 × 36 = 1080)
  const STUDENTS_PER_CLASS = 30;
  let studentCount = 0;
  for (let ci = 0; ci < allClassDefs.length; ci++) {
    const cls = classMap.get(allClassDefs[ci].name)!;
    for (let s = 0; s < STUDENTS_PER_CLASS; s++) {
      const gi     = ci * STUDENTS_PER_CLASS + s;
      const email  = `hs${String(gi + 1).padStart(4, "0")}@eduassess.vn`;
      const { name, sex } = genStudentName(gi);
      const student = await prisma.user.upsert({
        where:  { email },
        update: {},
        create: { name, email, password: studentPw, role: "STUDENT", sex,
                  address: genAddress(gi), dateOfBirth: genDob(allClassDefs[ci].gradeNumber, gi),
                  phoneNumber: `09${String(gi).padStart(8,"0")}`.slice(0,11) },
      });
      await prisma.studentClass.upsert({
        where:  { studentId_classId: { studentId: student.id, classId: cls.id } },
        update: {},
        create: { studentId: student.id, classId: cls.id },
      });
      studentCount++;
    }
    if ((ci + 1) % 6 === 0)
      console.log(`   ... ${ci + 1} lớp xong (${(ci + 1) * STUDENTS_PER_CLASS} học sinh)`);
  }
  console.log(`✅ ${studentCount} học sinh`);

  // 9. Topics
  const topicsJson = loadJson<TopicData[]>("topics.json");
  const upsertedTopics = await Promise.all(
    topicsJson.map(async (t) => {
      const subject = subjectMap.get(t.subject);
      const grade   = gradeMap.get(t.gradeNumber);
      if (!subject || !grade) { console.warn(`⚠️  Bỏ qua topic: ${t.name}`); return null; }
      const ex = await prisma.topic.findFirst({ where: { name: t.name, subjectId: subject.id, gradeId: grade.id } });
      return ex ?? await prisma.topic.create({ data: { name: t.name, subjectId: subject.id, gradeId: grade.id } });
    })
  );
  const validTopics = upsertedTopics.filter(Boolean) as NonNullable<typeof upsertedTopics[0]>[];
  const topicMap    = new Map(validTopics.map((t) => [`${t!.name}|${t!.subjectId}|${t!.gradeId}`, t!]));
  console.log(`✅ ${validTopics.length} chủ đề`);

  // 10. Questions
  const defaultCreator = teacherUsers[0];
  const questionFiles  = ["questions_math.json","questions_physics.json","questions_chemistry.json","questions_bio.json"];
  let qCreated = 0, qSkipped = 0;
  for (const file of questionFiles) {
    const fp = path.join(DATA_DIR, file);
    if (!fs.existsSync(fp)) { console.warn(`⚠️  Không tìm thấy: ${file}`); continue; }
    for (const q of loadJson<QuestionData[]>(file)) {
      const subject = subjectMap.get(q.subject);
      const grade   = gradeMap.get(q.gradeNumber);
      if (!subject || !grade) continue;
      const topic = topicMap.get(`${q.topic}|${subject.id}|${grade.id}`);
      if (!topic) { console.warn(`⚠️  Topic không tồn tại: ${q.topic}`); continue; }
      const ex = await prisma.question.findFirst({ where: { content: q.content, subjectId: subject.id } });
      if (ex) { qSkipped++; continue; }
      await prisma.question.create({
        data: { content: q.content, options: q.options as unknown as object[], difficulty: q.difficulty,
                status: "APPROVED", topicId: topic.id, subjectId: subject.id,
                createdById: defaultCreator.id, explanation: q.explanation ?? null },
      });
      qCreated++;
    }
  }
  console.log(`✅ ${qCreated} câu hỏi mới (${qSkipped} đã tồn tại)`);

  // Summary
  console.log("\n🎉 Seed hoàn tất!");
  console.log("─".repeat(60));
  console.log("  Admin     : admin@eduassess.vn          / Admin123!");
  console.log("  Giáo viên : gv.toan1@eduassess.vn       / Teacher123!");
  console.log("  Học sinh  : hs0001–hs1080@eduassess.vn  / Student123!");
  console.log("─".repeat(60));
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
