import Sidebar from './Sidebar'

export default function Layout({ children }) {
  return (
    // overflow-x-hidden on the outer wrapper prevents the off-screen mobile
    // sidebar drawer (translate-x-full) from creating a horizontal scrollbar
    // on browsers that don't clip fixed/translated children automatically.
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#F4F6F9] overflow-x-hidden">
      <Sidebar />
      <main className="flex-1 min-w-0 w-full overflow-x-hidden">
        <div className="p-4 sm:p-5 md:p-8 max-w-[1400px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
