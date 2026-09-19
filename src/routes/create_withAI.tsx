import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Sparkles,
  ArrowLeft,
  Plus,
  Mic,
  ArrowUp,
} from "lucide-react";

import Sidebar from "@/components/Sidebar";
import { supabase } from "@/lib/supabase";


export const Route = createFileRoute("/create_withAI")({
  component: CreateWithAI,
});



function CreateWithAI() {


  const [user,setUser] = useState<any>(null);


  const [messages,setMessages] = useState<any[]>([]);


  const [input,setInput] = useState("");


  const [hasChatStarted,setHasChatStarted] =
    useState(false);




  useEffect(()=>{

    loadUser();

  },[]);




  async function loadUser(){

    const {data} =
      await supabase.auth.getUser();


    setUser(data.user);


  }





  function handleSend(){


    if(!input.trim())
      return;



    setHasChatStarted(true);



    setMessages(prev=>[

      ...prev,

      {
        role:"user",
        text:input
      },


      {
        role:"ai",
        text:"กำลังคิดแผนเที่ยวให้คุณครับ ✨"
      }

    ]);



    setInput("");

  }





  return (

    <div className="travel-home flex min-h-[100dvh] md:h-screen text-foreground aurora-canvas">



      <Sidebar user={user}/>




      <main
        className="travel-main flex-1 flex flex-col min-w-0"
      >




        {/* Header */}

        <header
          className="travel-header h-16 flex items-center px-6 gap-3"
        >





          <Sparkles size={20}/>



          <h1 className="font-semibold">

            Trip Planner AI

          </h1>


        </header>






        {/* Chat Area */}


        {!hasChatStarted ? (

          <div
            className="
              flex-1
              flex
              flex-col
              items-center
              justify-center
              px-6
              text-center
            "
          >


            <div
              className="
                text-5xl
                mb-4
              "
            >

              🌍✨

            </div>




            <h1
              className="
                text-3xl
                font-semibold
              "
            >

              Where to today,{" "}

              {
                user?.user_metadata?.full_name
                ||
                "Guest"
              }
              ?

            </h1>




            <p
              className="
                text-muted-foreground
                mt-3
                max-w-md
              "
            >

              Hey there, I'm here to assist you
              in planning your travel experience.

              <br/>

              Ask me anything travel related.

            </p>



          </div>


        ) : (


          <div
            className="
              flex-1
              overflow-y-auto
              px-6
              py-6
              space-y-4
            "
          >


            {messages.map((msg,index)=>(


              <div

                key={index}

                className={`
                  flex
                  ${
                    msg.role==="user"
                    ?
                    "justify-end"
                    :
                    "justify-start"
                  }
                `}

              >



                <div

                  className={`
                    max-w-md
                    rounded-2xl
                    px-4
                    py-3
                    whitespace-pre-line

                    ${
                      msg.role==="user"
                      ?
                      "bg-black text-white"
                      :
                      "bg-gray-100"
                    }

                  `}

                >

                  {msg.text}


                </div>



              </div>


            ))}


          </div>


        )}





        {/* Input */}


        <div
          className="
            px-6
            pb-8
          "
        >


          <div
            className="travel-composer max-w-2xl mx-auto border rounded-3xl shadow-sm bg-card"
          >



            <input

              value={input}

              onChange={(e)=>
                setInput(e.target.value)
              }


              onKeyDown={(e)=>{

                if(e.key==="Enter")
                  handleSend();

              }}


              placeholder="Ask anything"

              className="
                w-full
                px-5
                pt-4
                pb-2
                bg-transparent
                outline-none
              "

            />





            <div
              className="
                flex
                items-center
                justify-between
                px-3
                pb-3
              "
            >



              <button

                className="
                  h-8
                  w-8
                  rounded-full
                  hover:bg-accent
                  flex
                  items-center
                  justify-center
                "

              >

                <Plus size={16}/>

              </button>





              <div
                className="
                  flex
                  items-center
                  gap-1
                "
              >



                <button

                  className="
                    h-8
                    w-8
                    rounded-full
                    hover:bg-accent
                    flex
                    items-center
                    justify-center
                  "

                >

                  <Mic
                    size={16}
                    className="text-muted-foreground"
                  />

                </button>





                <button

                  onClick={handleSend}

                  className="
                    h-8
                    w-8
                    rounded-full
                    bg-foreground
                    text-background
                    flex
                    items-center
                    justify-center
                  "

                >

                  <ArrowUp size={16}/>

                </button>



              </div>



            </div>



          </div>





          <p
            className="
              text-center
              text-xs
              text-muted-foreground
              mt-3
            "
          >

            ⓘ TravelWise AI can make mistakes.
            Check important information.

          </p>



        </div>




      </main>



    </div>

  );

}