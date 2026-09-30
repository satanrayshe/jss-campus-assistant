// JSS University Noida: campus knowledge base.
// Facts gathered from the official site (jssuninoida.edu.in) in Sep 2026.
// `official: false` marks general guidance that isn't published on the site.

const SITE = "https://jssuninoida.edu.in";

window.CAMPUS = {
  name: "JSS University Noida",
  address: "C-20/1, Sector-62, Noida, U.P. 201301",
  categories: [
    { id: "academics", label: "Academics", icon: "📘" },
    { id: "library", label: "Library", icon: "📚" },
    { id: "hostel", label: "Hostel", icon: "🏠" },
    { id: "facilities", label: "Campus Facilities", icon: "🏫" },
    { id: "clubs", label: "Clubs & Events", icon: "🎉" },
    { id: "wellbeing", label: "Safety & Wellbeing", icon: "🛡️" },
    { id: "contact", label: "Contacts & Portals", icon: "☎️" },
  ],
  faqs: [
    {
      id: "attendance",
      category: "academics",
      question: "What is the minimum attendance required?",
      keywords: ["attendance", "75", "percent", "shortage", "eligible", "debar", "detained", "bunk", "classes"],
      answer:
        "You need **at least 75% attendance in each course** you register for. Below that, you are not eligible to sit the **SEE (Semester End Examination)** for that course.\n\n- It's counted **per course**, not as an overall average.\n- Your mentor and the department track it, and you can check it on the student portal.",
      source: `${SITE}/academics-regulations-policies`,
      official: true,
    },
    {
      id: "exams",
      category: "academics",
      question: "How are we evaluated (CIE and SEE)?",
      keywords: ["exam", "exams", "cie", "see", "internal", "marks", "evaluation", "grading", "test", "semester", "rubrics"],
      answer:
        "Each course is assessed in two parts:\n\n- **CIE (Continuous Internal Evaluation):** tests, assignments and lab work during the semester, marked against the university's *Evaluation Rubrics Guidelines*.\n- **SEE (Semester End Examination):** the final exam. You must have **75% attendance** in that course to sit it.\n\nThe exact weightage depends on your programme's regulations (B.Tech, MCA, MBA, B.Pharm and so on), which are published on the Academic Regulations page.",
      source: `${SITE}/academics-regulations-policies`,
      official: true,
    },
    {
      id: "regulations",
      category: "academics",
      question: "Where can I find my programme's rules and regulations?",
      keywords: ["regulations", "rules", "policy", "policies", "btech", "b.tech", "mca", "mba", "pharm", "nep", "minor", "honours", "syllabus"],
      answer:
        "All official regulations are on the **Academic Regulations & Policies** page of the university website. They include:\n\n- **B.Tech** Regulations 2026-27, plus B.Tech **Honours** and **Minor Degree** 2026-27\n- **NEP 2020** Regulations 2025-26\n- **MCA, MBA, MA, MSc** regulations\n- **B.Pharm, D.Pharm and M.Pharm** regulations\n- Policies on first-year electives, SWAYAM-NPTEL courses, evaluation rubrics, mentoring, placements and internships, and prevention of sexual harassment",
      source: `${SITE}/academics-regulations-policies`,
      official: true,
    },
    {
      id: "nptel",
      category: "academics",
      question: "Can I earn credits through SWAYAM-NPTEL courses?",
      keywords: ["nptel", "swayam", "online", "course", "credits", "mooc", "certificate"],
      answer:
        "Yes. The university publishes **SWAYAM-NPTEL Courses Guidelines 2025-26**, which set out which online courses count and how credits transfer.\n\nCheck the guidelines on the Academic Regulations page, then confirm with your department coordinator **before** you enrol, so the course is counted.",
      source: `${SITE}/academics-regulations-policies`,
      official: true,
    },
    {
      id: "timetable",
      category: "academics",
      question: "How do I find my timetable and classroom?",
      keywords: ["timetable", "time", "table", "schedule", "classroom", "room", "class", "lecture", "where", "block", "lab"],
      answer:
        "Your class timetable and room numbers come from your **department**:\n\n- Check the **student portal** and your department's **notice board**.\n- Your **faculty mentor** is the first person to ask. Every student is assigned one.\n- In the first week, class representatives usually share the timetable in the section group.",
      source: `${SITE}/student-resources`,
      official: false,
    },
    {
      id: "library-collection",
      category: "library",
      question: "What does the library have?",
      keywords: ["library", "books", "journals", "ebooks", "e-books", "magazines", "newspapers", "digital", "study", "reading", "research"],
      answer:
        "The **Library & Information Centre** holds:\n\n- **1,44,052 books**\n- **1,331 peer-reviewed journals**\n- **156 print journals and magazines**\n- **10 newspaper titles**\n\nIt also has computer workstations with high-speed internet, **quiet study areas, group study rooms**, online databases and e-books, plus book clubs, author talks and orientation workshops.",
      source: `${SITE}/library-information-centre`,
      official: true,
    },
    {
      id: "library-timings",
      category: "library",
      question: "What are the library timings?",
      keywords: ["library", "timing", "timings", "hours", "open", "close", "closing", "sunday", "time"],
      answer:
        "The university website doesn't publish library hours. Students report that the library **closes around 8:00 PM** and is **closed on Sundays**.\n\nConfirm the current hours at the library front desk, especially near exams, when hours sometimes change.",
      source: `${SITE}/library-information-centre`,
      official: false,
    },
    {
      id: "hostel-curfew",
      category: "hostel",
      question: "What are the hostel curfew timings?",
      keywords: ["curfew", "hostel", "timing", "timings", "in-time", "intime", "gate", "night", "late", "entry", "boys", "girls", "biometric"],
      answer:
        "Hostel curfew hours:\n\n- **Boys:** 10:00 PM to 6:00 AM\n- **Girls:** 8:30 PM to 6:00 AM\n\nEntry and exit are recorded with a **biometric system**, and security is on duty 24/7.",
      source: `${SITE}/campus-facilities`,
      official: true,
    },
    {
      id: "hostel-rules",
      category: "hostel",
      question: "What is not allowed in the hostel?",
      keywords: ["hostel", "rules", "allowed", "prohibited", "banned", "alcohol", "smoking", "drugs", "tobacco", "cigarette", "discipline"],
      answer:
        "**Alcohol, drugs, tobacco and other intoxicants** are strictly prohibited in the hostels.\n\nYou're also expected to:\n- keep your room and the common areas clean\n- report maintenance problems straight away\n- follow the curfew (boys 10:00 PM, girls 8:30 PM)",
      source: `${SITE}/campus-facilities`,
      official: true,
    },
    {
      id: "hostel-facilities",
      category: "hostel",
      question: "What facilities do the hostels have, and how are rooms allotted?",
      keywords: ["hostel", "room", "rooms", "ac", "facilities", "allotment", "allot", "mess", "wifi", "laundry", "gym", "stay", "accommodation"],
      answer:
        "The boys' and girls' hostels are separate and on campus. Rooms are **air-conditioned**.\n\n- **Boys' hostel:** en-suite bathrooms, personal storage, internet, a shared gym, a gaming zone and a multipurpose hall\n- **Girls' hostel:** high-speed Wi-Fi, study desks, a library lounge, laundry and recreation spaces\n- **Mess:** certified by the Department of Food Safety\n\nRooms are allotted on a **first-come, first-served** basis, so apply early.",
      source: `${SITE}/campus-facilities`,
      official: true,
    },
    {
      id: "food",
      category: "facilities",
      question: "Where can I eat on campus?",
      keywords: ["food", "eat", "canteen", "cafeteria", "cafe", "coffee", "mess", "lunch", "veg", "nonveg", "snacks", "hungry"],
      answer:
        "You can eat at:\n\n- **Cafeteria:** fresh **vegetarian and non-vegetarian** food, certified by the Department of Food Safety\n- **Coffee outlet** in the Amenities Centre\n- **Hostel mess** for residents, also food-safety certified",
      source: `${SITE}/campus-facilities`,
      official: true,
    },
    {
      id: "sports",
      category: "facilities",
      question: "What sports and gym facilities are there?",
      keywords: ["sports", "gym", "fitness", "cricket", "football", "basketball", "badminton", "volleyball", "table", "tennis", "chess", "kabaddi", "ground", "play"],
      answer:
        "**Outdoor:** football, cricket, volleyball, basketball, kho-kho and kabaddi, on a large sports ground.\n\n**Indoor:** badminton, table tennis and chess.\n\nThe **Fitness Center** is in the Amenities Centre, and the boys' hostel has its own gym.",
      source: `${SITE}/campus-facilities`,
      official: true,
    },
    {
      id: "amenities",
      category: "facilities",
      question: "Is there an ATM, photocopy shop or stationery shop on campus?",
      keywords: ["atm", "bank", "cash", "photocopy", "xerox", "print", "printing", "reprographics", "stationery", "shop", "store", "guest", "house", "wifi", "internet"],
      answer:
        "Yes. The **Amenities Centre** has:\n\n- a **bank ATM** (open round the clock)\n- **reprographics** for photocopying and printing\n- a **general utilities shop** for stationery and daily needs\n- a **coffee outlet** and a multipurpose hall\n\nThere's also campus-wide **high-speed Wi-Fi** and an AC **guest house** for visiting parents.",
      source: `${SITE}/campus-facilities`,
      official: true,
    },
    {
      id: "medical",
      category: "wellbeing",
      question: "What if I fall sick on campus?",
      keywords: ["sick", "ill", "doctor", "medical", "health", "hospital", "first", "aid", "injury", "fever", "clinic"],
      answer:
        "Go to the **Primary Health Center** on campus. It's staffed by qualified professionals.\n\nIn an emergency, tell campus security (on duty 24/7) or your hostel warden straight away.",
      source: `${SITE}/campus-facilities`,
      official: true,
    },
    {
      id: "clubs",
      category: "clubs",
      question: "What clubs and societies can I join?",
      keywords: ["club", "clubs", "society", "societies", "join", "ieee", "csi", "jcsi", "sae", "iete", "iste", "vega", "supra", "technical", "chapter"],
      answer:
        "Professional and technical societies on campus:\n\n- **JCSI:** the Computer Society of India branch, under the CSI Ghaziabad Chapter\n- **IEEE:** the world's largest technical professional organisation\n- **SAE International:** its **Team VEGA** builds a race car for the **SUPRA** competition\n- **IETE:** Institution of Electronics and Telecommunication Engineers\n- **ISTE:** Indian Society for Technical Education\n\nThere are also recreational and cultural clubs. Recruitment drives usually run early in the semester, so watch the notice boards.",
      source: `${SITE}/student-life`,
      official: true,
    },
    {
      id: "fest",
      category: "clubs",
      question: "What is Zealicon, the campus fest?",
      keywords: ["fest", "festival", "zealicon", "event", "events", "cultural", "techno", "concert", "annual", "march"],
      answer:
        "**Zealicon** is the annual **techno-cultural fest** of the JSS Noida campus, held every year since 2008.\n\n- It's a **4-day event**, usually around **February-March**.\n- Technical events run during the day: coding, robotics, airshows and paper presentations.\n- Cultural events run into the night: dance, singing, debate and a Battle of the Bands.\n\nThe campus also hosts **technical talks** and **alumni meets** during the year.",
      source: "https://www.knowafest.com/explore/college/JSS-Academy-of-Technical-Education-Noida",
      official: false,
    },
    {
      id: "anti-ragging",
      category: "wellbeing",
      question: "How do I report ragging?",
      keywords: ["ragging", "ragged", "bully", "bullying", "harass", "harassment", "senior", "seniors", "complaint", "report", "unsafe"],
      answer:
        "Ragging is a punishable offence. You can report it to:\n\n- the university's **Anti-Ragging Cell**\n- the **National Anti-Ragging Helpline: 1800-180-5522** (toll-free, 24x7), or helpline@antiragging.in\n- your faculty mentor or hostel warden\n\nYour identity is kept confidential. For sexual harassment, the university has a separate **Prevention of Sexual Harassment (POSH)** committee.",
      source: `${SITE}/student-life`,
      official: true,
    },
    {
      id: "grievance",
      category: "wellbeing",
      question: "Who do I contact if I have a complaint or grievance?",
      keywords: ["grievance", "complaint", "complain", "problem", "issue", "redressal", "unfair", "posh", "committee", "disabled", "differently", "abled"],
      answer:
        "Take it to the **Grievance Redressal Committee**. It handles academic and administrative complaints.\n\n- Harassment goes to the **POSH committee**.\n- Ragging goes to the **Anti-Ragging Cell**.\n- For anything you're unsure about, start with your **faculty mentor**.\n\nThe university also provides support for differently-abled students.",
      source: `${SITE}/student-life`,
      official: true,
    },
    {
      id: "counselling",
      category: "wellbeing",
      question: "Is there mental health or counselling support?",
      keywords: ["counselling", "counseling", "counsellor", "mental", "health", "stress", "anxiety", "depressed", "lonely", "homesick", "therapy", "mentor", "mentoring"],
      answer:
        "Yes. There are two kinds of support:\n\n- **Counselling Cell:** confidential mental health support. You don't need a referral.\n- **Mentoring scheme:** about **250 faculty mentors** look after **6,000+ students**, so you have an assigned mentor from day one.\n\nFeeling homesick or stressed in first year is very common. Reaching out early helps.",
      source: `${SITE}/student-life`,
      official: true,
    },
    {
      id: "portal",
      category: "contact",
      question: "How do I log in to the student portal?",
      keywords: ["portal", "login", "erp", "student", "password", "results", "marks", "attendance", "online", "website"],
      answer:
        "The student portal is at **https://studentportal.universitysolutions.in/**\n\nIt's where you check attendance, marks and academic records. Your login details come from the university at registration. If you can't log in, ask your department office.",
      source: `${SITE}/student-resources`,
      official: true,
    },
    {
      id: "placements",
      category: "contact",
      question: "How do placements and internships work?",
      keywords: ["placement", "placements", "internship", "internships", "job", "jobs", "tpo", "company", "companies", "resume", "cv", "recruitment", "career"],
      answer:
        "The **Training & Placement Office (TPO)** runs placements through:\n\n- the **Placement Portal**, for registration, profile verification and company applications\n- the **Assessment Portal**, for test schedules, links and practice\n- a **Resume Building Platform**\n\nThe TPO Guidelines, General Instructions, Summer Internship Letter format and Early Joining application format are on the Student Resources page.",
      source: `${SITE}/student-resources`,
      official: true,
    },
    {
      id: "contact",
      category: "contact",
      question: "What is the university's address and phone number?",
      keywords: ["contact", "phone", "number", "call", "email", "address", "location", "where", "whatsapp", "reach", "office", "admission", "admissions"],
      answer:
        "**JSS University Noida**\nC-20/1, Sector-62, Noida, U.P. 201301\n\n- **Phone:** 0120-2401484 (direct), 0120-2400115 (EPBX)\n- **Mobile:** +91 93118 30458\n- **WhatsApp:** https://wa.me/917599201722\n- **Email:** admissions@jssuninoida.edu.in",
      source: `${SITE}/student-resources`,
      official: true,
    },
  ],
};
