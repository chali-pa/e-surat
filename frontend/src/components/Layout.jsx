import Sidebar from './Sidebar'

export default function Layout({ children }) {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#F4F6F9]">
      <Sidebar />
      <main className="flex-1 min-h-screen min-w-0 w-full overflow-x-hidden">
        <div className="p-5 md:p-8 max-w-[1400px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
