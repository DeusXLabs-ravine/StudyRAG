import { Link } from 'react-router-dom';
import { Github, Twitter, Linkedin, Mail, Heart } from 'lucide-react';
import Logo from '../common/Logo';

export default function Footer() {
    const currentYear = new Date().getFullYear();

    const footerLinks = [
        {
            title: 'Platform',
            links: [
                { label: 'Learning Journey', path: '/learn' },
                { label: 'Smart Quiz', path: '/quiz' },
                { label: 'Study Chat', path: '/chat' },
                { label: 'Manage Docs', path: '/documents' },
            ]
        },
        {
            title: 'Support',
            links: [
                { label: 'Contact Us', href: 'mailto:support@studyrag.co' },
                { label: 'Feedback', href: 'mailto:feedback@studyrag.co' },
                { label: 'Partnerships', href: 'mailto:partnerships@studyrag.co' },
            ]
        },
        {
            title: 'Legal',
            links: [
                { label: 'Privacy Policy', path: '/privacy' },
                { label: 'Terms of Service', path: '/terms' },
            ]
        }
    ];

    return (
        <footer className="bg-white border-t border-gray-100 pt-20 pb-10 px-6 mt-auto">
            <div className="max-w-7xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-16">
                    <div className="lg:col-span-2 space-y-6">
                        <Logo className="h-10 w-10 text-primary-600" textClassName="text-2xl font-black text-gray-900" />
                        <p className="text-gray-500 max-w-sm text-sm font-medium leading-relaxed">
                            StudyRAG helps students and professionals study from notes, PDFs, and research material with grounded AI chat, quizzes, flashcards, and guided learning.
                        </p>
                        <div className="flex items-center gap-4">
                            <a href="#" className="p-2.5 rounded-xl bg-gray-50 text-gray-400 hover:text-primary hover:bg-primary/5 transition-all subtle-raise">
                                <Twitter className="h-5 w-5" />
                            </a>
                            <a href="#" className="p-2.5 rounded-xl bg-gray-50 text-gray-400 hover:text-primary hover:bg-primary/5 transition-all subtle-raise">
                                <Github className="h-5 w-5" />
                            </a>
                            <a href="#" className="p-2.5 rounded-xl bg-gray-50 text-gray-400 hover:text-primary hover:bg-primary/5 transition-all subtle-raise">
                                <Linkedin className="h-5 w-5" />
                            </a>
                            <a href="mailto:support@studyrag.co" className="p-2.5 rounded-xl bg-gray-50 text-gray-400 hover:text-primary hover:bg-primary/5 transition-all subtle-raise">
                                <Mail className="h-5 w-5" />
                            </a>
                        </div>
                    </div>

                    {footerLinks.map((section) => (
                        <div key={section.title} className="space-y-6">
                            <h4 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">{section.title}</h4>
                            <ul className="space-y-4">
                                {section.links.map((link) => (
                                    <li key={link.label}>
                                        {link.href ? (
                                            <a
                                                href={link.href}
                                                className="text-gray-600 hover:text-primary transition-colors text-sm font-bold"
                                            >
                                                {link.label}
                                            </a>
                                        ) : (
                                            <Link
                                                to={link.path}
                                                className="text-gray-600 hover:text-primary transition-colors text-sm font-bold"
                                            >
                                                {link.label}
                                            </Link>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                <div className="pt-10 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-gray-400">
                        <span>Copyright {currentYear} StudyRAG Inc.</span>
                        <span className="hidden md:inline">|</span>
                        <span className="flex items-center gap-1">
                            Made with <Heart className="h-3 w-3 text-red-400 fill-red-400" /> for thinkers.
                        </span>
                    </div>

                    <div className="flex items-center gap-8">
                        <span className="flex items-center gap-2 text-xs font-bold text-gray-400">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            All Systems Operational
                        </span>
                        <div className="h-4 w-px bg-gray-200 hidden md:block" />
                        <div className="flex items-center gap-2 text-xs font-bold text-gray-400">
                            Language: <span className="text-gray-900">English (US)</span>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
