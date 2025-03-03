
import Sections from "./sections";
import AboutSection from "./aboutsection";
import ExploreCourses from "./exploreCourses";
import Footer from "../footer/page";
import Navbar from "../Navbar/page";

// Ensure correct import
export default function Page() {
    return <div className="ml-20 mr-20">
    <Navbar/>
   <Sections /> 
   <hr className="my-12 h-px border-t-0 bg-transparent bg-gradient-to-r 
      from-transparent via-neutral-500 to-transparent opacity-25 dark:via-neutral-400" />
   
   <    ExploreCourses />  
   <hr className="my-12 h-px border-t-0 bg-transparent bg-gradient-to-r 
      from-transparent via-neutral-500 to-transparent opacity-25 dark:via-neutral-400" />
   <AboutSection /> 
   <hr className="my-12 h-px border-t-0 bg-transparent bg-gradient-to-r 
      from-transparent via-neutral-500 to-transparent opacity-25 dark:via-neutral-400" />
    <Footer/> 
    </div>  
    
    
    ;
}
