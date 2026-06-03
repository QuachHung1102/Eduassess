export const dynamic = "force-dynamic";

import Link from "next/link";

export default function Home() {
  const highlights = [
    "Biết rõ mình đang yếu ở đâu để ôn đúng nơi, không học dàn trải",
    "Flashcard, bài kiểm tra và phản hồi kết quả — tất cả trong cùng một nơi",
    "Tiến bộ được ghi lại sau mỗi buổi học để không bao giờ lạc hướng",
  ];

  const features = [
    {
      tag: "Flashcard",
      title: "Ôn trọng tâm nhanh hơn, nhớ lâu hơn",
      desc: "Các bộ flashcard được tổ chức theo môn, chủ đề và độ khó giúp em ôn đúng chỗ thay vì đọc lại toàn bộ sách giáo khoa mỗi lần trước thi.",
      accent: "from-emerald-200/35 to-lime-100/10",
    },
    {
      tag: "Bài kiểm tra",
      title: "Làm bài và nhận phản hồi ngay sau khi nộp",
      desc: "Sau mỗi bài kiểm tra, em biết ngay câu nào sai, sai ở đâu và phần kiến thức nào cần làm lại — không phải chờ đến khi nhận bài trả.",
      accent: "from-blue-200/35 to-indigo-100/10",
    },
    {
      tag: "Theo dõi tiến bộ",
      title: "Nhìn thấy mình đang cải thiện từng ngày",
      desc: "Mỗi lần ôn tập hoặc làm bài đều được ghi lại. Em thấy rõ điểm yếu đang thu hẹp dần và những phần em đã thực sự vững.",
      accent: "from-amber-200/35 to-stone-200/10",
    },
    {
      tag: "Gợi ý học tập",
      title: "Biết hôm nay nên ôn gì thay vì đoán mò",
      desc: "Hệ thống phân tích kết quả và đề xuất những nội dung cần ôn tiếp, giúp em không lãng phí thời gian vào những phần đã nắm chắc.",
      accent: "from-yellow-200/35 to-stone-100/10",
    },
  ];

  const journey = [
    {
      step: "01",
      title: "Tìm đúng bộ học liệu theo môn đang học",
      desc: "Em vào tìm thấy flashcard, bài kiểm tra thử và đề ôn luyện theo đúng môn, chủ đề và mức độ mình cần — không cần lục lọc ở nhiều nơi khác nhau.",
    },
    {
      step: "02",
      title: "Ôn tập và làm bài trong cùng một không gian",
      desc: "Flashcard và bài kiểm tra nằm cùng nhau, giúp em chuyển từ xem lý thuyết sang luyện đề liền mạch mà không bị gián đoạn.",
    },
    {
      step: "03",
      title: "Xem kết quả, biết chính xác cần ôn thêm gì",
      desc: "Sau mỗi bài, em thấy rõ phần nào đã vững, phần nào còn hụt và bước tiếp theo cần làm — để không học dàn trải mà không biết mình thiếu ở đâu.",
    },
  ];

  const roles = [
    {
      title: "Cho học sinh",
      desc: "Ôn tập có hệ thống, làm bài có phản hồi và thấy rõ tiến bộ của bản thân sau mỗi buổi học thay vì chỉ học rồi không biết mình đang ở đâu.",
    },
    {
      title: "Cho phụ huynh",
      desc: "Theo dõi kết quả kiểm tra, nắm được tiến độ học tập của con và biết con đang cần củng cố phần nào — không cần hỏi mới biết.",
    },
  ];

  return (
    <div className="app-shell min-h-screen">
      <header className="px-5 py-5 sm:px-6 lg:px-8">
        <div className="glass-panel mx-auto flex max-w-7xl items-center justify-between rounded-full px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#0f88f2,#19c2a8)] text-lg font-black text-white shadow-lg shadow-sky-200/70">
              EA
            </span>
            <span>
              <span className="block text-base font-extrabold tracking-tight text-slate-900">EduAssess</span>
              <span className="block text-xs text-slate-500">Học tập trực quan, đánh giá thông minh</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
            <a href="#features" className="hover:text-sky-600">
              Tính năng
            </a>
            <a href="#journey" className="hover:text-sky-600">
              Cách học
            </a>
            <a href="#roles" className="hover:text-sky-600">
              Dành cho ai
            </a>
            <Link href="/login" className="secondary-button px-5 py-2.5 text-sm">
              Đăng nhập
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-7xl gap-12 px-5 pb-20 pt-10 sm:px-6 lg:grid-cols-[1.08fr_0.92fr] lg:px-8 lg:pb-28 lg:pt-16">
          <div className="relative z-10">
            <span className="brand-badge mb-6">Ôn tập thông minh hơn, kết quả rõ hơn mỗi ngày</span>
            <h1 className="max-w-3xl text-5xl font-black leading-[1.04] tracking-tight text-slate-900 sm:text-6xl lg:text-7xl">
              Học sinh biết rõ
              <span className="block bg-[linear-gradient(135deg,#0f88f2,#19c2a8)] bg-clip-text text-transparent">
                mình đang ở đâu.
              </span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">
              EduAssess giúp em ôn tập có định hướng, làm bài kiểm tra có phản hồi và theo dõi
              tiến bộ bản thân — thay vì chỉ học rồi không biết mình còn thiếu gì.
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link href="/register" className="primary-button">
                Bắt đầu học miễn phí
                <span aria-hidden="true">→</span>
              </Link>
              <a href="#features" className="secondary-button">
                Xem cách hoạt động
              </a>
            </div>

            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              {[
                { value: "Flashcard", label: "Ôn trọng tâm, nhớ lâu hơn" },
                { value: "Kiểm tra", label: "Phản hồi ngay sau khi nộp bài" },
                { value: "Tiến bộ", label: "Ghi lại kết quả sau mỗi buổi học" },
              ].map((item) => (
                <div key={item.value} className="glass-panel rounded-3xl px-5 py-4">
                  <div className="text-lg font-black text-slate-900">{item.value}</div>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{item.label}</p>
                </div>
              ))}
            </div>

            <div className="mt-10 space-y-3">
              {highlights.map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-3 rounded-2xl bg-white/65 px-4 py-3 text-sm text-slate-700 shadow-[0_12px_30px_rgba(15,70,117,0.06)]"
                >
                  <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs font-black text-emerald-600">
                    ✓
                  </span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -left-3 top-12 hidden h-24 w-24 rounded-4xl bg-amber-300/35 blur-2xl sm:block" />
            <div className="absolute -right-3 bottom-12 hidden h-28 w-28 rounded-full bg-sky-300/35 blur-2xl sm:block" />

            <div className="glass-panel relative rounded-4xl p-4 sm:p-6">
              <div className="rounded-[1.8rem] bg-slate-950 px-5 py-5 text-white shadow-2xl shadow-slate-900/18 sm:px-6 sm:py-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-sky-200/80">
                      Hồ sơ học tập và đánh giá
                    </p>
                    <h2 className="mt-2 text-2xl font-black">Mỗi kết quả đều có ý nghĩa sư phạm</h2>
                  </div>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-sky-100">
                    Academic view
                  </span>
                </div>

                <div className="mt-6 grid gap-4">
                  <div className="rounded-[1.6rem] bg-white/8 p-4 backdrop-blur">
                    <div className="flex items-center justify-between text-sm text-sky-100/85">
                      <span>Mức độ đạt chuẩn tuần này</span>
                      <span className="font-bold text-white">76%</span>
                    </div>
                    <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full w-[76%] rounded-full bg-[linear-gradient(90deg,#36d1dc,#5b86e5,#ffd166)]" />
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-3 text-center text-xs">
                      <div className="rounded-2xl bg-white/7 px-3 py-3">
                        <div className="text-lg font-black text-white">18</div>
                        <div className="mt-1 text-sky-100/70">thẻ ôn tập</div>
                      </div>
                      <div className="rounded-2xl bg-white/7 px-3 py-3">
                        <div className="text-lg font-black text-white">2 đề</div>
                        <div className="mt-1 text-sky-100/70">đã đánh giá</div>
                      </div>
                      <div className="rounded-2xl bg-white/7 px-3 py-3">
                        <div className="text-lg font-black text-white">+12%</div>
                        <div className="mt-1 text-sky-100/70">mức cải thiện</div>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-[1.1fr_0.9fr]">
                    <div className="rounded-[1.6rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.14),rgba(255,255,255,0.05))] p-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold text-white">Năng lực theo môn</span>
                        <span className="rounded-full bg-emerald-400/18 px-2.5 py-1 text-[11px] font-bold text-emerald-200">
                          Có dữ liệu mới
                        </span>
                      </div>
                      <div className="mt-4 space-y-3 text-sm">
                        {[
                          { name: "Vật lý", score: "82 điểm", tone: "bg-sky-400" },
                          { name: "Hóa học", score: "76 điểm", tone: "bg-amber-300" },
                          { name: "Sinh học", score: "88 điểm", tone: "bg-emerald-400" },
                        ].map((subject) => (
                          <div key={subject.name} className="rounded-2xl bg-white/7 px-3 py-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <span className={`h-3 w-3 rounded-full ${subject.tone}`} />
                                <span className="font-semibold text-white">{subject.name}</span>
                              </div>
                              <span className="text-sky-100/78">{subject.score}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-[1.6rem] bg-white p-4 text-slate-900">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold">Ưu tiên hôm nay</span>
                        <span className="soft-label">2 trọng tâm</span>
                      </div>
                      <div className="mt-4 space-y-3">
                        {[
                          "Làm bài ngắn kiểm tra phần điện học",
                          "Ôn 12 flashcard khái niệm axit - bazơ",
                          "Đọc lại 3 lỗi sai ở lần đánh giá gần nhất",
                        ].map((task, index) => (
                          <div key={task} className="flex items-start gap-3 rounded-2xl bg-slate-50 px-3 py-3 text-sm text-slate-600">
                            <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-sky-100 text-xs font-black text-sky-700">
                              {index + 1}
                            </span>
                            <span>{task}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="absolute -left-5 bottom-8 hidden rounded-[1.8rem] bg-white/90 px-4 py-3 shadow-xl shadow-slate-900/10 backdrop-blur sm:block">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">Không cần đoán mò</p>
                <p className="mt-1 text-sm font-semibold text-slate-700">
                  Em biết hôm nay cần ôn gì và còn thiếu ở đâu
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-7xl px-5 py-6 sm:px-6 lg:px-8">
          <div className="mb-10 max-w-3xl">
            <span className="soft-label">Tính năng dành cho học sinh</span>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
              Mọi thứ em cần để ôn tập hiệu quả đều có trong một nơi.
            </h2>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {features.map((feature) => (
              <div key={feature.title} className="feature-card">
                <div className={`absolute inset-x-0 top-0 h-28 bg-linear-to-br ${feature.accent}`} />
                <div className="relative">
                  <span className="soft-label">{feature.tag}</span>
                  <h3 className="mt-5 text-2xl font-black leading-tight text-slate-900">{feature.title}</h3>
                  <p className="mt-4 text-[15px] leading-7 text-slate-600">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="journey" className="mx-auto max-w-7xl px-5 py-20 sm:px-6 lg:px-8">
          <div className="glass-panel rounded-4xl px-6 py-8 sm:px-8 sm:py-10 lg:px-12">
            <div className="max-w-2xl">
              <span className="soft-label">Cách học</span>
              <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                Từ lần đầu vào học đến khi nắm vững — một hành trình không bị gián đoạn.
              </h2>
            </div>

            <div className="mt-10 grid gap-5 lg:grid-cols-3">
              {journey.map((item) => (
                <div
                  key={item.step}
                  className="rounded-[1.8rem] bg-white/88 p-6 shadow-[0_18px_40px_rgba(15,70,117,0.08)]"
                >
                  <span className="text-sm font-black tracking-[0.28em] text-sky-500">{item.step}</span>
                  <h3 className="mt-4 text-xl font-black text-slate-900">{item.title}</h3>
                  <p className="mt-3 text-[15px] leading-7 text-slate-600">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="roles" className="mx-auto max-w-7xl px-5 pb-24 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-4xl bg-[linear-gradient(145deg,#123047,#0f4b78)] px-7 py-8 text-white shadow-[0_30px_70px_rgba(7,62,104,0.24)] sm:px-8 sm:py-10">
              <span className="inline-flex rounded-full bg-white/12 px-3 py-1 text-xs font-bold uppercase tracking-[0.24em] text-sky-100">
                Dành cho ai?
              </span>
              <h2 className="mt-5 text-3xl font-black leading-tight sm:text-4xl">
                Không chỉ học — mà học đúng hướng và thấy mình tiến bộ.
              </h2>
              <p className="mt-4 text-[15px] leading-7 text-sky-100/84">
                Nhiều học sinh học chăm nhưng không rõ mình tiến bộ ở đâu. EduAssess giúp
                việc ôn tập trở nên có cấu trúc, có phản hồi và dễ duy trì động lực hơn
                mỗi ngày — cho học sinh lẫn phụ huynh theo dõi cùng.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {roles.map((role) => (
                <div key={role.title} className="feature-card">
                  <h3 className="text-xl font-black text-slate-900">{role.title}</h3>
                  <p className="mt-4 text-[15px] leading-7 text-slate-600">{role.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 pb-24 sm:px-6 lg:px-8">
          <div className="rounded-[2.2rem] bg-[linear-gradient(135deg,#0f88f2,#19c2a8)] px-6 py-10 text-center text-white shadow-[0_28px_70px_rgba(15,136,242,0.28)] sm:px-10 sm:py-14">
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-sky-100/85">
              Sẵn sàng ôn tập đúng hướng từ hôm nay?
            </p>
            <h2 className="mx-auto mt-4 max-w-3xl text-3xl font-black leading-tight sm:text-4xl">
              Bắt đầu với bộ flashcard đầu tiên — miễn phí, không cần thẻ tín dụng.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-sky-50/90 sm:text-lg">
              Đăng ký tài khoản để truy cập flashcard, bài kiểm tra và theo dõi tiến bộ
              của mình trong một nơi duy nhất — dễ dùng ngay từ lần đầu.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
              <Link href="/register" className="secondary-button bg-white px-7 text-sky-700">
                Đăng ký miễn phí
              </Link>
              <Link
                href="/login"
                className="rounded-full border border-white/35 px-7 py-4 font-bold text-white hover:bg-white/10"
              >
                Vào hệ thống
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/55 px-5 py-8 text-center text-sm text-slate-500">
        © 2026 EduAssess. Nơi học sinh ôn tập có định hướng, làm bài có phản hồi và hiểu rõ mình đang tiến bộ đến đâu.
      </footer>
    </div>
  );
}