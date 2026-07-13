// ──────────────────────────────────────────────────
// Admin Navigation — Data Structure
// All sidebar / navbar items are defined here so the
// component tree simply maps over this array.
// ──────────────────────────────────────────────────

export type MenuChild = {
  label: string;
  href: string;
  icon?: string;           // SVG icon key
  badge?: string;          // optional badge text
  uiConcept?: "toggle" | "form";   // special UI hint
  formFields?: string[];   // for "form" concept items
  children?: MenuChild[];  // nested sub-menu (level 3)
};

export type MenuItem = {
  label: string;
  href: string;
  icon: string;             // SVG icon key (mapped in icons)
  type: "link" | "dropdown";
  badge?: string;
  children?: MenuChild[];
};

export const adminMenuData: MenuItem[] = [
  // ─── 1. Masters ─────────────────────────
  {
    label: "Masters",
    href: "/admin/masters",
    icon: "database",
    type: "dropdown",
    children: [
      {
        label: "Course Catalog",
        href: "/admin/masters/catalog",
        icon: "book",
        children: [
          { label: "Categories",      href: "/admin/masters/catalog/categories",    icon: "folder" },
          { label: "Sub-categories", href: "/admin/masters/catalog/subcategories", icon: "layers" },
          { label: "Subjects",        href: "/admin/masters/catalog/subjects",      icon: "bookmark" },
          { label: "Manage Courses",        href: "/admin/masters/catalog/courses",    icon: "list" },
        ],
      },
      {
        label: "Curriculum",
        href: "/admin/masters/curriculum",
        icon: "layout",
        children: [
          { label: "Chapter Builder", href: "/admin/masters/curriculum/syllabus",    icon: "layers" },
          { label: "Course Materials", href: "/admin/masters/curriculum/media",       icon: "video" },
          // { label: "Assessments",      href: "/admin/masters/curriculum/assessments", icon: "check-square" },
          {
            label: "Question Bank",
            href: "/admin/masters/curriculum/questions",
            icon: "help-circle",
            children: [
              { label: "Question Types", href: "/admin/masters/curriculum/questions/question-types", icon: "list" },
              { label: "Comprehensions", href: "/admin/masters/curriculum/questions/comprehensions", icon: "file-text" },
            ],
          },
          {
            label: "Manage Tests",            
            href: "/admin/masters/curriculum/exams",       
            icon: "clipboard",
            children: [
               { label: "Quizzes", href: "/admin/masters/curriculum/exams/quizzes", icon: "file-text" },
               { label: "Exams", href: "/admin/masters/curriculum/exams/exams", icon: "clipboard" },
               { label: "Quiz Types", href: "/admin/masters/curriculum/exams/quiz-types", icon: "list" },
               { label: "Exam Types", href: "/admin/masters/curriculum/exams/exam-types", icon: "tag" }
            ]
          },
        ],
      },
      {
        label: "Teachers",
        href: "/admin/teachers",
        icon: "users",
      },
      {
        label: "Leadership Team",
        href: "/admin/masters/leadership",
        icon: "star",
      },
    ],
  },




  // ─── 3. Batch ───────────────────────────
  {
    label: "Batch",
    href: "/admin/batch",
    icon: "layers",
    type: "link",
  },

  // ─── 4. Academic ────────────────────────
  {
    label: "Academic",
    href: "/admin/academic",
    icon: "graduation-cap",
    type: "dropdown",
    children: [
      { label: "Register Student",  href: "/admin/academic/register",          icon: "user-plus" },
      { label: "Course Purchase",   href: "/admin/academic/purchase",          icon: "shopping-cart" },
      { label: "Batch Assign",      href: "/admin/academic/batch-assign",      icon: "git-merge" },
      { label: "Course Progress",   href: "/admin/academic/course-progress",   icon: "bar-chart" },
      { label: "Examination",       href: "/admin/academic/examination",       icon: "edit" },
      { label: "Certification",     href: "/admin/academic/certification",     icon: "award" },
      { label: "Student Feedback",  href: "/admin/academic/student-feedback",  icon: "video" },
    ],
  },

  // ─── 5. Fees / Payments ─────────────────
  {
    label: "Fees / Payments",
    href: "/admin/fees",
    icon: "credit-card",
    type: "dropdown",
    children: [
      { label: "Payments",                         href: "/admin/fees/payments",    icon: "dollar-sign" },
      { label: "Course / Batch Collections",       href: "/admin/fees/collections", icon: "pie-chart" },
      { label: "Due (Outstanding)",                href: "/admin/fees/due",         icon: "alert-circle" },
    ],
  },

  // ─── 5.5 CMS ─────────────────────────────
  {
    label: "CMS",
    href: "/admin/cms",
    icon: "file-text",
    type: "dropdown",
    children: [
      { label: "Blogs", href: "/admin/blogs", icon: "file-text" },
      { label: "Navbar CMS", href: "/admin/cms/navbar", icon: "menu" },
      { label: "Footer Menu", href: "/admin/cms/footer", icon: "layout" },
    ],
  },

  // ─── 6. Settings ────────────────────────
  {
    label: "Settings",
    href: "/admin/settings",
    icon: "settings",
    type: "dropdown",
    children: [
      {
        label: "Maintenance Mode",
        href: "/admin/settings/maintenance",
        icon: "tool",
      },
      { label: "Email Settings",   href: "/admin/settings/email",   icon: "mail" },
      { label: "Fomo Notifications", href: "/admin/settings/fomo", icon: "bell" },
      { label: "Payment Settings", href: "/admin/settings/payment", icon: "credit-card" },
      { label: "R2 Bucket Setup",  href: "/admin/settings/r2",      icon: "database" },
      { label: "AI Settings",      href: "/admin/settings/ai",      icon: "cpu" },
      {
        label: "Site Settings",
        href: "/admin/settings/site",
        icon: "globe",
        uiConcept: "form",
        formFields: ["Name", "Email", "Phone Number"],
      },
      {
        label: "Institute",
        href: "/admin/settings/institute",
        icon: "home",
        children: [
          { label: "About Us",   href: "/admin/settings/institute/about-us",   icon: "info" },
          { label: "Contact Us", href: "/admin/settings/institute/contact-us", icon: "phone" },
          { label: "FAQs",       href: "/admin/settings/institute/faq",        icon: "help-circle" },
        ],
      },
    ],
  },
];
