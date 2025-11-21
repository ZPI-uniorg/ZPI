import React, { useRef, useEffect, useMemo } from 'react';
import TagList from '../../dashboard/components/TagList.jsx';
import { useNavigate } from 'react-router-dom';
import { useProjects } from './ProjectsContext.jsx';

export default function FiltersPanel({
	filtersOpen,
	openFilters,
	closeFilters,
	selectedTags,
	logic,
	setLogic,
	toggleTag
}) {
	const tagListRootRef = useRef(null);
	const navigate = useNavigate();
	const { projects } = useProjects();

	// Wyciąganie unikalnych tagów z projektów + nazwy projektów
	const tags = useMemo(() => {
		const collected = new Set();
		projects.forEach(p => {
			if (Array.isArray(p?.tags)) {
				p.tags.forEach(t => {
					if (typeof t === 'string' && t.trim()) collected.add(t.trim());
					else if (t && typeof t.name === 'string' && t.name.trim()) collected.add(t.name.trim());
				});
			}
		});
		return Array.from(collected);
	}, [projects]);

	const allFilterItems = useMemo(
		() => [...tags, ...projects.map(p => p.name).filter(Boolean)],
		[tags, projects]
	);

	useEffect(() => {
		if (!filtersOpen) return;
		const root = tagListRootRef.current;
		if (!root) return;
		const nodes = root.querySelectorAll('h1,h2,h3,h4,h5,h6,p,span,div');
		nodes.forEach(el => {
			const text = (el.textContent || '').trim().toLowerCase();
			if (text === 'tagi') el.style.display = 'none';
		});
		const btns = Array.from(root.querySelectorAll('button'));
		const group = btns.find(b =>
			['AND', 'OR'].includes((b.textContent || '').trim().toUpperCase())
		)?.parentElement;
		if (group && root.contains(group)) group.style.display = 'none';
	}, [filtersOpen]);

	return (
		<>
			{/* Trigger button can be placed outside; overlay */}
			<div
				onClick={closeFilters}
				className={`fixed inset-0 z-[60] bg-slate-900/50 backdrop-blur-sm transition-opacity duration-300 ${filtersOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
			/>
			<aside
				className={`fixed left-0 top-0 z-[70] h-full w-[420px] max-w-[90vw] transform rounded-r-2xl border-r border-[rgba(148,163,184,0.35)] bg-[rgba(15,23,42,0.98)] shadow-[0_25px_60px_rgba(15,23,42,0.6)] transition-transform duration-300 ${filtersOpen ? 'translate-x-0' : '-translate-x-full'}`}
			>
				<div className="flex items-center justify-between px-5 py-4">
					<div className="flex items-center gap-3">
						<h2 className="m-0 text-base font-semibold text-slate-200">Filtry</h2>
						<div className="inline-flex items-center gap-2 rounded-full bg-slate-800/60 p-1">
							<button
								type="button"
								onClick={() => setLogic('AND')}
								className={`px-4 py-1.5 rounded-full text-xs font-semibold transition ${logic === 'AND'
									? 'bg-violet-600 text-white shadow-[0_8px_24px_rgba(124,58,237,0.45)]'
									: 'text-slate-300 hover:text-white hover:bg-slate-700/60'}`}
							>
								AND
							</button>
							<button
								type="button"
								onClick={() => setLogic('OR')}
								className={`px-4 py-1.5 rounded-full text-xs font-semibold transition ${logic === 'OR'
									? 'bg-violet-600 text-white shadow-[0_8px_24px_rgba(124,58,237,0.45)]'
									: 'text-slate-300 hover:text-white hover:bg-slate-700/60'}`}
							>
								OR
							</button>
						</div>
					</div>
					<button
						onClick={closeFilters}
						className="rounded-lg p-2 text-slate-300 hover:bg-slate-700/40 transition"
						aria-label="Zamknij filtry"
					>
						<span className="block h-5 w-5 leading-5 text-center">×</span>
					</button>
				</div>

				<div
					ref={tagListRootRef}
					className="flex h-[calc(100%-64px-72px)] flex-col overflow-hidden px-5 py-4"
				>
					<TagList
						tags={allFilterItems}
						projects={projects}
						selectedTags={selectedTags}
						logic={logic}
						setLogic={setLogic}
						toggleTag={toggleTag}
					/>
				</div>

				<div className="flex gap-2 border-t border-[rgba(148,163,184,0.2)] px-5 py-4">
					<button
						onClick={() => navigate('/organization/project/new')}
						className="flex-1 rounded-[14px] bg-gradient-to-r from-violet-500 to-fuchsia-500 py-3 text-sm font-semibold text-white shadow-md shadow-violet-500/30 hover:brightness-110 transition"
					>
						nowy projekt
					</button>
					<button
						onClick={() => navigate('/organization/tag/new')}
						className="flex-1 rounded-[14px] bg-gradient-to-r from-violet-500 to-fuchsia-500 py-3 text-sm font-semibold text-white shadow-md shadow-violet-500/30 hover:brightness-110 transition"
					>
						nowy tag
					</button>
				</div>
			</aside>
		</>
	);
}
