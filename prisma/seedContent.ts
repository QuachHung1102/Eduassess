/**
 * Seed nội dung demo: Flashcard, Khóa học, Lớp học (+ buổi/điểm danh/đánh giá),
 * Đề kiểm tra (+ lượt làm) và Đánh giá năng lực.
 *
 * Idempotent: guard từng "parent" bằng findFirst-or-create; bản ghi con dùng
 * createMany({ skipDuplicates: true }) dựa trên unique constraint. Chạy lại an toàn.
 *
 * Lớp demo để ở chế độ ONLINE → không cần RoomOccupancy (lịch phòng test qua UI).
 */

import { prisma } from "../lib/db/prisma";

// Ảnh Cloudinary chắc chắn render (đã có trong tài khoản, next/image cho phép host này).
const DEMO_IMG =
  "https://res.cloudinary.com/dwjziopfp/image/upload/v1780816970/flashcards/mzk60dlcwdt4lh5ru7fp.jpg";

type Opt = { label: string; text: string; isCorrect: boolean };

/** Thứ Hai cách đây `weeks` tuần (UTC, 12:00 để tránh lệch ngày). */
function mondayWeeksAgo(weeks: number): Date {
  const d = new Date();
  d.setUTCHours(12, 0, 0, 0);
  const diffToMon = (d.getUTCDay() + 6) % 7; // số ngày kể từ Thứ Hai
  d.setUTCDate(d.getUTCDate() - diffToMon - weeks * 7);
  return d;
}
function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export async function seedContent() {
  // ── Prerequisites ─────────────────────────────────────────
  const subjects = await prisma.subject.findMany();
  const subjectByName = new Map(subjects.map((s) => [s.name, s]));
  const grades = await prisma.grade.findMany();
  const gradeByNum = new Map(grades.map((g) => [g.gradeNumber, g]));

  const teachers = await prisma.user.findMany({
    where: { role: "TEACHER" },
    orderBy: { email: "asc" },
  });
  const students = await prisma.user.findMany({
    where: { role: "STUDENT" },
    orderBy: { email: "asc" },
  });
  const cbdtList = await prisma.user.findMany({
    where: { role: "STAFF", staffPosition: "CBDT" },
    orderBy: { email: "asc" },
  });
  const cbdts = await prisma.user.findFirst({
    where: { role: "STAFF", staffPosition: "CBDTS" },
  });

  const toan = subjectByName.get("Toán");
  const vatly = subjectByName.get("Vật lý");
  const hoa = subjectByName.get("Hóa học");
  const grade10 = gradeByNum.get(10);

  if (!toan || !grade10 || teachers.length === 0 || students.length < 8 || cbdtList.length === 0) {
    console.warn("⚠️  Thiếu dữ liệu nền (môn/khối/giáo viên/học sinh/CBDT) — bỏ qua seedContent.");
    return;
  }
  const teacher = teachers[0];
  const cbdt = cbdtList[0];

  // ════════════════════════════════════════════════════════════
  // A. FLASHCARD
  // ════════════════════════════════════════════════════════════
  const flashSeeds: Array<{
    title: string;
    subjectId: string;
    topicName: string;
    difficulty: "EASY" | "MEDIUM" | "HARD";
    captions: string[];
  }> = [
    {
      title: "Hằng đẳng thức đáng nhớ",
      subjectId: toan.id,
      topicName: "Hằng đẳng thức",
      difficulty: "EASY",
      captions: ["(a+b)² = a² + 2ab + b²", "(a−b)² = a² − 2ab + b²", "a² − b² = (a−b)(a+b)", "(a+b)³ = a³ + 3a²b + 3ab² + b³"],
    },
    {
      title: "Công thức lượng giác cơ bản",
      subjectId: toan.id,
      topicName: "Lượng giác",
      difficulty: "MEDIUM",
      captions: ["sin²x + cos²x = 1", "tan x = sin x / cos x", "sin 2x = 2 sin x cos x", "cos 2x = cos²x − sin²x"],
    },
    {
      title: "Đơn vị & hằng số Vật lý",
      subjectId: (vatly ?? toan).id,
      topicName: "Đại cương",
      difficulty: "EASY",
      captions: ["g ≈ 9,8 m/s²", "c = 3×10⁸ m/s", "1 N = 1 kg·m/s²", "1 J = 1 N·m"],
    },
  ];
  let flashCreated = 0;
  for (const fs of flashSeeds) {
    const exists = await prisma.flashcardSet.findFirst({ where: { title: fs.title } });
    if (exists) continue;
    const set = await prisma.flashcardSet.create({
      data: {
        title: fs.title,
        subjectId: fs.subjectId,
        gradeId: grade10.id,
        topicName: fs.topicName,
        difficulty: fs.difficulty,
        createdById: teacher.id,
      },
    });
    await prisma.flashcardCard.createMany({
      data: fs.captions.map((caption, i) => ({
        setId: set.id,
        imageUrl: DEMO_IMG,
        caption,
        order: i + 1,
      })),
    });
    flashCreated++;
  }
  console.log(`✅ Flashcard: ${flashCreated} bộ mới`);

  // ════════════════════════════════════════════════════════════
  // B. KHÓA HỌC + BÀI GIẢNG (PUBLISHED) + ghi danh/đánh giá/Q&A
  // ════════════════════════════════════════════════════════════
  const courseSeeds = [
    {
      title: "Nền tảng Đại số 10",
      subjectId: toan.id,
      description: "Khóa học online ôn tập đại số lớp 10: hằng đẳng thức, phương trình, bất phương trình.",
      lessons: [
        { title: "Bài 1 — Hằng đẳng thức đáng nhớ", content: "# Hằng đẳng thức\n\nGhi nhớ 7 hằng đẳng thức cơ bản.\n\n$$(a+b)^2 = a^2 + 2ab + b^2$$" },
        { title: "Bài 2 — Phương trình bậc hai", content: "# Phương trình bậc hai\n\nDạng $ax^2 + bx + c = 0$.\n\nBiệt thức $\\Delta = b^2 - 4ac$." },
        { title: "Bài 3 — Bất phương trình", content: "# Bất phương trình\n\nXét dấu tam thức bậc hai để giải." },
      ],
    },
    {
      title: "Vật lý 10 — Động học",
      subjectId: (vatly ?? toan).id,
      description: "Chuyển động thẳng đều, biến đổi đều và các công thức động học.",
      lessons: [
        { title: "Bài 1 — Chuyển động thẳng đều", content: "# Chuyển động thẳng đều\n\n$v = \\dfrac{s}{t}$ (không đổi)." },
        { title: "Bài 2 — Chuyển động biến đổi đều", content: "# Biến đổi đều\n\n$v = v_0 + at$, $s = v_0 t + \\dfrac{1}{2}at^2$." },
      ],
    },
  ];
  let courseCreated = 0;
  for (const cs of courseSeeds) {
    const exists = await prisma.course.findFirst({ where: { title: cs.title, authorId: teacher.id } });
    if (exists) continue;
    const course = await prisma.course.create({
      data: {
        title: cs.title,
        description: cs.description,
        subjectId: cs.subjectId,
        authorId: teacher.id,
        status: "PUBLISHED",
        isFree: true,
      },
    });
    await prisma.lesson.createMany({
      data: cs.lessons.map((l, i) => ({
        courseId: course.id,
        title: l.title,
        content: l.content,
        order: i + 1,
      })),
    });
    // Ghi danh 5 HS đầu; HS đầu tiên hoàn thành bài 1 + để lại review.
    const enrollees = students.slice(0, 5);
    await prisma.enrollment.createMany({
      data: enrollees.map((s) => ({ courseId: course.id, studentId: s.id })),
      skipDuplicates: true,
    });
    const firstLesson = await prisma.lesson.findFirst({
      where: { courseId: course.id },
      orderBy: { order: "asc" },
    });
    if (firstLesson) {
      await prisma.lessonProgress.createMany({
        data: enrollees.slice(0, 2).map((s) => ({ lessonId: firstLesson.id, studentId: s.id })),
        skipDuplicates: true,
      });
    }
    await prisma.courseReview.createMany({
      data: [
        { courseId: course.id, studentId: enrollees[0].id, rating: 5, comment: "Khóa học dễ hiểu, ví dụ rõ ràng." },
        { courseId: course.id, studentId: enrollees[1].id, rating: 4, comment: "Nội dung tốt, mong có thêm bài tập." },
      ],
      skipDuplicates: true,
    });
    const q = await prisma.courseQA.create({
      data: { courseId: course.id, authorId: enrollees[2].id, content: "Thầy ơi, bài 2 có ví dụ minh họa không ạ?" },
    });
    await prisma.courseQA.create({
      data: { courseId: course.id, authorId: teacher.id, parentId: q.id, content: "Có nhé, thầy sẽ bổ sung video minh họa." },
    });
    courseCreated++;
  }
  console.log(`✅ Khóa học: ${courseCreated} khóa mới (+ bài giảng, ghi danh, review, Q&A)`);

  // ════════════════════════════════════════════════════════════
  // C. LỚP HỌC (ONLINE) + buổi + điểm danh + đánh giá buổi
  //    + phân CBDT (StudentAdvisor) + Availability
  // ════════════════════════════════════════════════════════════
  const CLASS_NAME = "Toán 10 – Nhóm A (demo)";
  const classEnrollees = students.slice(0, 6);
  let demoClass = await prisma.class.findFirst({ where: { name: CLASS_NAME } });
  let classCreated = 0;

  if (!demoClass) {
    const startDate = mondayWeeksAgo(3);
    demoClass = await prisma.class.create({
      data: {
        name: CLASS_NAME,
        subjectId: toan.id,
        advisorId: cbdt.id,
        createdById: cbdts?.id ?? cbdt.id,
        mode: "ONLINE",
        targetLevel: "AVERAGE",
        sessionCount: 8,
        startDate,
        status: "ONGOING",
      },
    });
    // GV phụ trách
    await prisma.classTeacher.create({ data: { classId: demoClass.id, teacherId: teacher.id } });
    // Khung lịch tuần: T2 & T4, 18:00–20:00 (ONLINE → roomId null)
    await prisma.classWeeklySlot.createMany({
      data: [
        { classId: demoClass.id, dayOfWeek: "MON", startTime: "18:00", endTime: "20:00", roomId: null },
        { classId: demoClass.id, dayOfWeek: "WED", startTime: "18:00", endTime: "20:00", roomId: null },
      ],
      skipDuplicates: true,
    });
    // Ghi danh
    await prisma.classEnrollment.createMany({
      data: classEnrollees.map((s) => ({ classId: demoClass!.id, studentId: s.id })),
      skipDuplicates: true,
    });

    // Sinh 8 buổi từ khung tuần (4 tuần × MON+WED)
    const todayMid = new Date();
    todayMid.setUTCHours(0, 0, 0, 0);
    const sessions: Array<{ date: Date; n: number }> = [];
    for (let w = 0; w < 4; w++) {
      sessions.push({ date: addDays(startDate, w * 7), n: w * 2 + 1 }); // MON
      sessions.push({ date: addDays(startDate, w * 7 + 2), n: w * 2 + 2 }); // WED
    }
    for (const s of sessions) {
      const isPast = s.date < todayMid;
      const sess = await prisma.classSession.create({
        data: {
          classId: demoClass.id,
          sessionNumber: s.n,
          date: s.date,
          startTime: "18:00",
          endTime: "20:00",
          mode: "ONLINE",
          roomId: null,
          teacherId: teacher.id,
          status: isPast ? "COMPLETED" : "SCHEDULED",
        },
      });
      if (isPast) {
        // Điểm danh + đánh giá buổi cho các buổi đã hoàn thành
        await prisma.attendance.createMany({
          data: classEnrollees.map((st, i) => ({
            sessionId: sess.id,
            studentId: st.id,
            status: (i === 2 && s.n === 2 ? "ABSENT" : i === 4 ? "LATE" : "PRESENT") as
              | "PRESENT"
              | "ABSENT"
              | "LATE"
              | "EXCUSED",
          })),
          skipDuplicates: true,
        });
        await prisma.sessionEvaluation.createMany({
          data: classEnrollees.map((st, i) => ({
            sessionId: sess.id,
            studentId: st.id,
            performance: 3 + ((i + s.n) % 3), // 3..5
            diligence: 3 + ((i + 1) % 3),
            comprehension: 3 + ((i + 2) % 3),
            evaluatedById: teacher.id,
          })),
          skipDuplicates: true,
        });
      }
    }

    // Phân HS cho CBDT (để CBDT được quyền đánh giá)
    await prisma.studentAdvisor.createMany({
      data: classEnrollees.map((s) => ({
        studentId: s.id,
        advisorId: cbdt.id,
        assignedById: cbdts?.id ?? cbdt.id,
      })),
      skipDuplicates: true,
    });
    classCreated = 1;
  }
  console.log(`✅ Lớp học: ${classCreated} lớp demo (8 buổi, điểm danh, đánh giá buổi, phân CBDT)`);

  // Availability: HS + GV có lịch rảnh chiều/tối các ngày trong tuần → test "Tạo lớp"
  const availDays = ["MON", "TUE", "WED", "THU", "FRI"] as const;
  const availSlots = [
    "AFTERNOON_15_16",
    "AFTERNOON_16_17",
    "AFTERNOON_17_18",
    "EVENING_18_19",
    "EVENING_19_20",
    "EVENING_20_21",
  ] as const;
  const availStudents = students.slice(0, 10);
  await prisma.studentAvailability.createMany({
    data: availStudents.flatMap((s) =>
      availDays.flatMap((d) =>
        availSlots.map((slot) => ({
          studentId: s.id,
          dayOfWeek: d,
          slot: slot,
          availabilityMode: "BOTH" as const,
        })),
      ),
    ),
    skipDuplicates: true,
  });
  await prisma.teacherAvailability.createMany({
    data: teachers.slice(0, 3).flatMap((t) =>
      availDays.flatMap((d) =>
        availSlots.map((slot) => ({
          teacherId: t.id,
          dayOfWeek: d,
          slot: slot,
          availabilityMode: "BOTH" as const,
        })),
      ),
    ),
    skipDuplicates: true,
  });
  console.log(`✅ Lịch rảnh: ${availStudents.length} HS + 3 GV (chiều/tối T2–T6)`);

  // ════════════════════════════════════════════════════════════
  // D. ĐỀ KIỂM TRA + lượt làm  ·  E. ĐÁNH GIÁ NĂNG LỰC
  // ════════════════════════════════════════════════════════════
  const toanQuestions = await prisma.question.findMany({
    where: { subjectId: toan.id, status: "APPROVED" },
    take: 5,
    select: { id: true, options: true },
  });

  if (demoClass && toanQuestions.length >= 1) {
    const EXAM_TITLE = "KT giữa kỳ — Đại số 10 (demo)";
    let exam = await prisma.exam.findFirst({ where: { title: EXAM_TITLE, classId: demoClass.id } });
    if (!exam) {
      exam = await prisma.exam.create({
        data: {
          title: EXAM_TITLE,
          subjectId: toan.id,
          classId: demoClass.id,
          createdById: teacher.id,
          kind: "EXAM",
          duration: 45,
          showAnswer: true,
          allowRetake: false,
          dueAt: addDays(mondayWeeksAgo(1), 4),
        },
      });
      await prisma.examQuestion.createMany({
        data: toanQuestions.map((q, i) => ({ examId: exam!.id, questionId: q.id, order: i + 1 })),
        skipDuplicates: true,
      });

      // Index đáp án đúng theo câu
      const correctIdx = new Map<string, number>();
      for (const q of toanQuestions) {
        const opts = (q.options as Opt[]) ?? [];
        correctIdx.set(q.id, opts.findIndex((o) => o.isCorrect));
      }

      // 4 HS đầu nộp bài với tỉ lệ đúng tăng dần
      const examTakers = classEnrollees.slice(0, 4);
      for (let ti = 0; ti < examTakers.length; ti++) {
        const st = examTakers[ti];
        const attempt = await prisma.examAttempt.create({
          data: {
            examId: exam.id,
            studentId: st.id,
            submittedAt: addDays(mondayWeeksAgo(1), 3),
          },
        });
        let correct = 0;
        const answers = toanQuestions.map((q, qi) => {
          const ci = correctIdx.get(q.id) ?? 0;
          // HS thứ ti trả lời đúng nếu (qi <= ti+1) → tỉ lệ đúng tăng dần
          const answerCorrectly = qi <= ti + 1;
          const selectedOption = answerCorrectly ? ci : (ci + 1) % 4;
          const isCorrect = selectedOption === ci;
          if (isCorrect) correct++;
          return { attemptId: attempt.id, questionId: q.id, selectedOption, isCorrect };
        });
        await prisma.examAnswer.createMany({ data: answers, skipDuplicates: true });
        const score = (correct / toanQuestions.length) * 100;
        await prisma.examAttempt.update({ where: { id: attempt.id }, data: { score } });
      }
      console.log(`✅ Đề KT: 1 đề (${toanQuestions.length} câu) + ${examTakers.length} lượt làm đã chấm`);
    } else {
      console.log("✅ Đề KT: đã tồn tại, bỏ qua");
    }

    // E. Đánh giá năng lực môn Toán cho HS trong lớp (guard: chưa có thì tạo)
    let levelCreated = 0;
    for (const st of classEnrollees) {
      const exists = await prisma.studentSubjectLevel.findFirst({
        where: { studentId: st.id, subjectId: toan.id },
      });
      if (exists) continue;
      // Lấy điểm Exam gần nhất (nếu có) để suy mức theo ngưỡng tài liệu
      const lastAttempt = await prisma.examAttempt.findFirst({
        where: { studentId: st.id, exam: { subjectId: toan.id }, submittedAt: { not: null } },
        orderBy: { submittedAt: "desc" },
        select: { score: true },
      });
      const sc = lastAttempt?.score ?? 60;
      const level = sc < 50 ? "WEAK" : sc < 80 ? "AVERAGE" : sc < 90 ? "GOOD" : "EXCELLENT";
      await prisma.studentSubjectLevel.create({
        data: {
          studentId: st.id,
          subjectId: toan.id,
          level,
          evaluatedById: cbdt.id,
          note: "Đánh giá demo từ seed",
        },
      });
      levelCreated++;
    }
    console.log(`✅ Đánh giá năng lực: ${levelCreated} HS (môn Toán)`);
  }
}
