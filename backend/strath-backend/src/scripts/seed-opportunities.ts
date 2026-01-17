import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "../db/schema";
import { opportunities, type OpportunityCategory } from "../db/schema";

// Create db connection directly
const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const db = drizzle(pool, { schema });

const seedOpportunities = async () => {
    console.log("🌱 Seeding opportunities...");

    const opportunitiesData: Array<{
        title: string;
        description: string;
        category: OpportunityCategory;
        organization: string;
        logo?: string;
        location?: string;
        locationType?: "remote" | "onsite" | "hybrid";
        deadline?: Date;
        applicationUrl?: string;
        requirements?: string[];
        salary?: string;
        stipend?: string;
        duration?: string;
        slots?: number;
        isFeatured?: boolean;
        contactEmail?: string;
        tags?: string[];
    }> = [
        // ============ INTERNSHIPS ============
        {
            title: "Software Engineering Intern",
            description: "Join Safaricom's tech team for a 3-month internship program. Work on real-world projects using modern technologies. You'll be mentored by senior engineers and gain hands-on experience in mobile and web development.",
            category: "internship",
            organization: "Safaricom PLC",
            logo: "https://upload.wikimedia.org/wikipedia/en/thumb/9/95/Safaricom_logo.svg/1200px-Safaricom_logo.svg.png",
            location: "Nairobi, Kenya",
            locationType: "hybrid",
            deadline: new Date("2026-02-15"),
            applicationUrl: "https://safaricom.co.ke/careers",
            requirements: ["Currently enrolled in CS/IT program", "Knowledge of Python or JavaScript", "Strong problem-solving skills"],
            stipend: "KES 40,000/month",
            duration: "3 months",
            slots: 15,
            isFeatured: true,
            contactEmail: "internships@safaricom.co.ke",
            tags: ["tech", "software", "mobile", "fintech"],
        },
        {
            title: "Data Science Internship",
            description: "Exciting opportunity to work with Equity Bank's data analytics team. Learn how to analyze financial data, build predictive models, and contribute to business intelligence projects.",
            category: "internship",
            organization: "Equity Bank",
            logo: "https://equitygroupholdings.com/assets/img/equity-logo.png",
            location: "Nairobi, Kenya",
            locationType: "onsite",
            deadline: new Date("2026-02-28"),
            applicationUrl: "https://equitybankgroup.com/careers",
            requirements: ["Statistics or Mathematics background", "Experience with Python/R", "Knowledge of SQL"],
            stipend: "KES 35,000/month",
            duration: "6 months",
            slots: 5,
            isFeatured: false,
            contactEmail: "careers@equitybank.co.ke",
            tags: ["data", "analytics", "finance", "banking"],
        },
        {
            title: "Marketing Intern",
            description: "Be part of Coca-Cola's marketing team in East Africa. Help create campaigns, manage social media, and learn from industry experts in brand management.",
            category: "internship",
            organization: "Coca-Cola Beverages Africa",
            location: "Nairobi, Kenya",
            locationType: "onsite",
            deadline: new Date("2026-03-01"),
            applicationUrl: "https://coca-colacompany.com/careers",
            requirements: ["Marketing or Communications student", "Creative mindset", "Social media savvy"],
            stipend: "KES 30,000/month",
            duration: "3 months",
            slots: 3,
            tags: ["marketing", "branding", "social media"],
        },

        // ============ PART-TIME JOBS ============
        {
            title: "Campus Brand Ambassador",
            description: "Represent top brands on campus! Flexible hours, great pay, and awesome networking opportunities. Perfect for students who want to earn while studying.",
            category: "part_time",
            organization: "Student Brands Kenya",
            location: "Strathmore University",
            locationType: "onsite",
            deadline: new Date("2026-01-30"),
            applicationUrl: "https://studentbrands.co.ke/apply",
            requirements: ["Active social media presence", "Good communication skills", "Available 10-15 hours/week"],
            salary: "KES 15,000/month + commissions",
            isFeatured: true,
            tags: ["flexible", "marketing", "networking"],
        },
        {
            title: "Tutor - Mathematics & Physics",
            description: "Join our team of academic tutors helping high school students excel in STEM subjects. Set your own schedule and earn competitive rates.",
            category: "part_time",
            organization: "Elimu Tutors",
            location: "Nairobi",
            locationType: "hybrid",
            applicationUrl: "https://elimututors.co.ke/join",
            requirements: ["Strong academic background", "Patient and good communicator", "Available weekends"],
            salary: "KES 800-1,500/hour",
            tags: ["teaching", "STEM", "flexible"],
        },
        {
            title: "Content Writer",
            description: "Write engaging articles for our tech blog. Work remotely, flexible deadlines, and build your portfolio while earning.",
            category: "part_time",
            organization: "TechWeez Media",
            locationType: "remote",
            deadline: new Date("2026-02-10"),
            applicationUrl: "https://techweez.com/careers",
            requirements: ["Excellent writing skills", "Interest in technology", "Portfolio of writing samples"],
            salary: "KES 2,000-5,000/article",
            tags: ["writing", "tech", "remote", "creative"],
        },

        // ============ FULL-TIME JOBS ============
        {
            title: "Graduate Trainee Program 2026",
            description: "KCB Bank is looking for fresh graduates to join our comprehensive 18-month graduate program. Rotate through different departments and accelerate your career in banking.",
            category: "full_time",
            organization: "KCB Bank",
            logo: "https://ke.kcbgroup.com/images/logo.png",
            location: "Nairobi, Kenya",
            locationType: "onsite",
            deadline: new Date("2026-03-15"),
            applicationUrl: "https://ke.kcbgroup.com/careers",
            requirements: ["Recent graduate (2024-2026)", "Minimum Second Class Upper", "Strong analytical skills"],
            salary: "KES 80,000 - 120,000/month",
            duration: "18 months",
            slots: 50,
            isFeatured: true,
            contactEmail: "graduates@kcbgroup.com",
            tags: ["banking", "finance", "graduate", "career"],
        },
        {
            title: "Junior Software Developer",
            description: "Join Andela's talent network and work with global companies on exciting projects. Full-time remote position with excellent benefits.",
            category: "full_time",
            organization: "Andela",
            logo: "https://andela.com/wp-content/uploads/2020/01/andela-logo.png",
            locationType: "remote",
            deadline: new Date("2026-02-20"),
            applicationUrl: "https://andela.com/careers",
            requirements: ["1+ years of coding experience", "Proficiency in JavaScript/Python", "Strong English communication"],
            salary: "USD 2,000 - 3,500/month",
            isFeatured: true,
            tags: ["software", "remote", "global", "tech"],
        },

        // ============ SCHOLARSHIPS ============
        {
            title: "Mastercard Foundation Scholarship",
            description: "Full scholarship covering tuition, accommodation, books, and living stipend for academically talented students with financial need. Includes leadership development and career services.",
            category: "scholarship",
            organization: "Mastercard Foundation",
            logo: "https://mastercardfdn.org/wp-content/uploads/2018/04/mastercard-foundation-logo.png",
            deadline: new Date("2026-04-30"),
            applicationUrl: "https://mastercardfdn.org/scholars-program",
            requirements: ["Kenyan citizen", "Financial need", "Academic excellence", "Leadership potential"],
            isFeatured: true,
            tags: ["full scholarship", "undergraduate", "financial aid"],
        },
        {
            title: "Equity Wings to Fly",
            description: "Scholarship for bright students from economically disadvantaged backgrounds. Covers secondary and university education with mentorship support.",
            category: "scholarship",
            organization: "Equity Group Foundation",
            deadline: new Date("2026-03-31"),
            applicationUrl: "https://equitygroupfoundation.com/wingstofly",
            requirements: ["KCPE score of 350+", "Proven financial need", "Active in community service"],
            isFeatured: true,
            tags: ["full scholarship", "secondary", "university", "need-based"],
        },
        {
            title: "DAAD Germany Scholarship",
            description: "Study in Germany! Full scholarship for Master's and PhD programs in German universities. Covers tuition, living expenses, and travel.",
            category: "scholarship",
            organization: "DAAD",
            logo: "https://www.daad.de/logo.svg",
            deadline: new Date("2026-05-15"),
            applicationUrl: "https://www.daad.de/en/study-and-research-in-germany/scholarships",
            requirements: ["Bachelor's degree", "Good academic record", "English/German proficiency"],
            tags: ["international", "masters", "PhD", "Germany", "Europe"],
        },

        // ============ GRANTS ============
        {
            title: "Youth Innovation Fund",
            description: "Grant funding for student-led startups and innovation projects. Get up to KES 500,000 to bring your ideas to life, plus mentorship from industry experts.",
            category: "grant",
            organization: "Kenya Innovation Agency",
            deadline: new Date("2026-02-28"),
            applicationUrl: "https://innovationagency.go.ke/youth-fund",
            requirements: ["Age 18-35", "Kenyan citizen", "Innovative project idea", "Team of 2-5 members"],
            salary: "Up to KES 500,000",
            isFeatured: false,
            tags: ["startup", "innovation", "funding", "entrepreneurship"],
        },
        {
            title: "Google for Startups Africa Fund",
            description: "Equity-free funding for African startups. Access to Google technology, mentorship, and a global network of entrepreneurs.",
            category: "grant",
            organization: "Google",
            logo: "https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png",
            deadline: new Date("2026-04-01"),
            applicationUrl: "https://startup.google.com/africa-fund",
            requirements: ["African-based startup", "Tech-enabled solution", "Seed to Series A stage"],
            salary: "USD 50,000 - 100,000",
            isFeatured: true,
            tags: ["startup", "tech", "funding", "Google"],
        },

        // ============ EVENTS ============
        {
            title: "Strathmore Tech Career Fair 2026",
            description: "Meet top employers, attend workshops, and discover internship and job opportunities. Bring your CV and dress professionally!",
            category: "event",
            organization: "Strathmore University Career Services",
            location: "Strathmore University, Main Campus",
            locationType: "onsite",
            deadline: new Date("2026-02-05"),
            applicationUrl: "https://strathmore.edu/career-fair",
            isFeatured: true,
            tags: ["career", "networking", "jobs", "employers"],
        },
        {
            title: "Nairobi Innovation Week",
            description: "A week-long festival celebrating African innovation. Hackathons, pitch competitions, workshops, and networking with investors and entrepreneurs.",
            category: "event",
            organization: "iHub Nairobi",
            location: "iHub, Nairobi",
            locationType: "hybrid",
            deadline: new Date("2026-03-10"),
            applicationUrl: "https://ihub.co.ke/niw",
            tags: ["innovation", "hackathon", "startup", "networking"],
        },
        {
            title: "Women in Tech Summit",
            description: "Empowering women in technology through inspiring talks, skill-building workshops, and networking opportunities. Open to all genders as allies!",
            category: "event",
            organization: "She Code Africa",
            location: "Online & Nairobi",
            locationType: "hybrid",
            deadline: new Date("2026-02-20"),
            applicationUrl: "https://shecodeafrica.org/summit",
            requirements: ["Interest in technology", "Commitment to diversity"],
            tags: ["women", "tech", "diversity", "workshop"],
        },

        // ============ WORKSHOPS ============
        {
            title: "UI/UX Design Bootcamp",
            description: "Intensive 4-week bootcamp to master UI/UX design. Learn Figma, user research, prototyping, and build a portfolio. Certificate included!",
            category: "workshop",
            organization: "Moringa School",
            logo: "https://moringaschool.com/logo.png",
            location: "Online",
            locationType: "remote",
            deadline: new Date("2026-02-01"),
            applicationUrl: "https://moringaschool.com/courses/ui-ux",
            requirements: ["Laptop with internet", "Basic computer skills", "Creative mindset"],
            salary: "KES 25,000 (discounted for students)",
            duration: "4 weeks",
            slots: 30,
            tags: ["design", "UI/UX", "Figma", "bootcamp"],
        },
        {
            title: "AWS Cloud Practitioner Training",
            description: "Free AWS certification training for university students. Learn cloud computing fundamentals and earn an industry-recognized certification.",
            category: "workshop",
            organization: "Amazon Web Services",
            logo: "https://a0.awsstatic.com/libra-css/images/logos/aws_logo_smile_1200x630.png",
            locationType: "remote",
            deadline: new Date("2026-02-15"),
            applicationUrl: "https://aws.amazon.com/training/digital/aws-cloud-practitioner-essentials",
            requirements: ["University student", "Basic IT knowledge", "Commitment to complete course"],
            isFeatured: false,
            tags: ["cloud", "AWS", "certification", "free"],
        },

        // ============ ANNOUNCEMENTS ============
        {
            title: "Library Extended Hours During Exams",
            description: "The main library will operate 24/7 during the examination period (Feb 15 - March 5). Study rooms available on first-come, first-served basis.",
            category: "announcement",
            organization: "Strathmore University Library",
            location: "Main Library, Strathmore",
            tags: ["library", "exams", "study"],
        },
        {
            title: "New Student ID Card Collection",
            description: "New and replacement student ID cards are ready for collection at the Student Services Office. Bring your admission letter and national ID.",
            category: "announcement",
            organization: "Student Services",
            location: "Student Services Office, Block A",
            contactEmail: "studentservices@strathmore.edu",
            tags: ["admin", "student ID", "registration"],
        },
        {
            title: "University Bus Route Changes",
            description: "Starting February 1st, the university shuttle will have new pickup points and schedules. Check the student portal for updated routes and times.",
            category: "announcement",
            organization: "Transport Department",
            deadline: new Date("2026-02-01"),
            applicationUrl: "https://portal.strathmore.edu/transport",
            tags: ["transport", "bus", "schedule"],
        },
    ];

    try {
        // Clear existing opportunities (for fresh seed)
        await db.delete(opportunities);
        console.log("🗑️ Cleared existing opportunities");

        // Insert new opportunities
        const inserted = await db.insert(opportunities).values(opportunitiesData).returning();
        console.log(`✅ Successfully seeded ${inserted.length} opportunities!`);

        // Log summary by category
        const summary: Record<string, number> = {};
        for (const opp of inserted) {
            summary[opp.category] = (summary[opp.category] || 0) + 1;
        }
        console.log("\n📊 Summary by category:");
        Object.entries(summary).forEach(([category, count]) => {
            console.log(`   ${category}: ${count}`);
        });

    } catch (error) {
        console.error("❌ Error seeding opportunities:", error);
        throw error;
    }

    process.exit(0);
};

seedOpportunities();
