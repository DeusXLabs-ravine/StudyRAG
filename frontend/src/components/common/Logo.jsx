import logoImg from '../../assets/logo.png';

export default function Logo({ className = "h-6 w-6 sm:h-12 sm:w-12", textClassName = "text-xs sm:text-xl font-bold text-gray-900", hideText = false, boxed = false }) {
    return (
        <div className="flex items-center gap-3 group">
            <div className={`relative flex items-center justify-center ${className} transition-all duration-500 group-hover:scale-110 ${boxed ? 'bg-white rounded-2xl shadow-md p-2 border border-blue-100' : 'bg-transparent border-transparent'}`}>
                <img
                    src={logoImg}
                    alt="StudyRAG Logo"
                    className="w-full h-full object-contain"
                />
            </div>
            {!hideText && (
                <div className="flex flex-col -space-y-1">
                    <span className={`${textClassName} tracking-tight leading-none transition-colors group-hover:text-blue-600`}>
                        Study<span className="text-blue-600 font-black">RAG</span>
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-purple-400/80 pl-0.5 transition-colors group-hover:text-purple-500">Quantum Logic</span>
                </div>
            )}
        </div>
    );
}
