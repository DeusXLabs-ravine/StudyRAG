import logoImg from '../../assets/logo.png';

export default function Logo({ className = "h-12 w-12", textClassName = "text-xl font-bold text-gray-900", hideText = false }) {
    return (
        <div className="flex items-center gap-3 group">
            <div className={`relative flex items-center justify-center ${className} transition-all duration-500 group-hover:scale-110 ${hideText ? 'bg-white rounded-2xl shadow-md p-2 border border-gray-100' : ''}`}>
                <img
                    src={logoImg}
                    alt="StudyRAG Logo"
                    className="w-full h-full object-contain"
                />
            </div>
            {!hideText && (
                <div className="flex flex-col -space-y-1">
                    <span className={`${textClassName} tracking-tight leading-none transition-colors group-hover:text-primary-600`}>
                        Study<span className="text-primary-600">RAG</span>
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary-500/50 pl-0.5">Quantum Logic</span>
                </div>
            )}
        </div>
    );
}
