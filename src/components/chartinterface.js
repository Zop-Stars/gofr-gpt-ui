"use client";
import React, { useState, useRef, useEffect } from "react";
import { Send, Menu, X, RotateCcw, Copy, Check } from "lucide-react";
import ReactMarkdown from "react-markdown";

import { Highlight, Prism } from "prism-react-renderer";

// Optional: Add additional language support as needed
import bashLang from "refractor/lang/bash";
bashLang(Prism);

const CodeBlock = ({ children, className }) => {
  const [isCopied, setIsCopied] = useState(false);
  const language = className?.replace(/language-/, "") || "";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(children.trimEnd());
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 1500);
  };

  return (
    <Highlight
      code={children.trimEnd()}
      language={language || "text"}
      theme={{
        plain: {
          backgroundColor: "#1e1e1e",
          color: "#dcdcdc",
          fontFamily: "'Fira Code', monospace",
          fontSize: "0.875rem",
          lineHeight: "1.5",
        },
        styles: [],
      }}
    >
      {({ className: highlightClassName, style, tokens, getTokenProps }) => (
        <div className="relative">
          <pre
            className={`${highlightClassName} bg-gray-900 rounded-lg p-4 flex overflow-x-auto`}
            style={style}
          >
            <code className="flex-1">
              {tokens.map((line, i) => (
                <div key={i} className="whitespace-pre-wrap">
                  {line.map((token, key) => (
                    <span key={key} {...getTokenProps({ token })} />
                  ))}
                </div>
              ))}
            </code>
            <button
              onClick={handleCopy}
              className="ml-4 flex items-center justify-center text-gray-500 hover:text-gray-300 transition duration-300"
              title={isCopied ? "Copied!" : "Copy"}
            >
              {isCopied ? (
                <Check size={16} className="text-green-500" />
              ) : (
                <Copy size={16} />
              )}
            </button>
          </pre>
          {language && (
            <div className="absolute top-2 left-2 text-xs text-gray-400 font-mono">
              {language}
            </div>
          )}
        </div>
      )}
    </Highlight>
  );
};

const ChatInterface = () => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [pendingCalls, setPendingCalls] = useState(new Map());
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [copiedMap, setCopiedMap] = useState(new Map());
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const samplePrompts = [
    // Quick Start Guide prompts
    "Deploy the application with Zop.dev",
    "Show me how to set up a Hello Server in GoFR.",
    "Explain the process of configuring environment variables.",
    "How can I connect my application to Redis?",
    "Provide a guide for integrating MySQL with GoFR.",
    "Show an example of GoFR observability features.",
    "Create a REST handler for an entity called 'User'.",

    // Advanced Guide prompts
    "How do I schedule a CRON job in GoFR?",
    "Explain how to override default configurations in GoFR.",
    "Change the log level remotely in a GoFR app.",
    "Show me how to publish custom metrics for performance monitoring.",
    "Explain how to add custom middleware to my GoFR application.",
    "Give an example of HTTP authentication in GoFR.",
    "How do I implement a circuit breaker in GoFR?",
    "Provide best practices for handling data migrations in GoFR.",
    "How can I write a gRPC server with GoFR?",
    "Demonstrate using a Pub/Sub system in GoFR.",
    "Explain how to manage a key-value store in GoFR.",

    // References prompts
    "Show me how to use GoFR's Context object in HTTP calls.",
    "List all default configurations available in GoFR.",
    "Provide a guide to testing with mocks in GoFR.",
    "Explain how to handle file uploads and downloads in GoFR.",
    "Show an example of automatic SwaggerUI rendering for APIs.",
    "How can I enable WebSocket communication in a GoFR application?",

    // General sample prompts
    "Show me how to create an error response with GoFR.",
    "Explain how to optimize SQL queries in GoFR applications.",
    "List all supported HTTP communication methods in GoFR.",
    "Provide a code snippet for monitoring service health with GoFR.",
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    return () => {
      pendingCalls.forEach((controller) => controller.abort());
    };
  }, [pendingCalls]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        isSidebarOpen &&
        !event.target.closest(".sidebar") &&
        !event.target.closest(".menu-button")
      ) {
        setIsSidebarOpen(false);
      }
    };

    document.addEventListener("click", handleOutsideClick);
    return () => {
      document.removeEventListener("click", handleOutsideClick);
    };
  }, [isSidebarOpen]);

  const makeApiCall = async (prompt, messageId) => {
    const controller = new AbortController();
    setPendingCalls((prev) => new Map(prev).set(messageId, controller));

    try {
      let response;
      let data;

      await new Promise((resolve, reject) => {
        const timeout = setTimeout(resolve, 1000 + Math.random() * 2000);
        controller.signal.addEventListener("abort", () => {
          clearTimeout(timeout);
          reject(new Error("Request cancelled"));
        });
      });

      response = await fetch(
        "https://gofr-service-new-gofr-app.0578ebec-adc6-4205-b53b-5255d11ec3c5.zop.dev/chat",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt: prompt,
          }),
          signal: controller.signal,
        }
      );

      data = await response.json();

      if (response.ok) {
        return `${data.data || "No response available."}`;
      } else {
        throw new Error(data.error || "Unknown error");
      }
    } catch (error) {
      if (error.name === "AbortError") {
        return null;
      }
      return `Error: ${error.message}. Please try again.`;
    } finally {
      setPendingCalls((prev) => {
        const newMap = new Map(prev);
        newMap.delete(messageId);
        return newMap;
      });
    }
  };

  const handleCancel = (messageId) => {
    const controller = pendingCalls.get(messageId);
    if (controller) {
      controller.abort();
      setMessages((prev) =>
        prev.filter((msg) => msg.id !== `${messageId}-response`)
      );
    }
  };

  const handleRetry = async (messageId) => {
    const originalMessage = messages.find(
      (msg) => msg.id === messageId.replace("-response", "")
    );
    if (originalMessage) {
      setMessages((prev) => prev.filter((msg) => msg.id !== `${messageId}`));
      handleSubmit(originalMessage.text);
    }
  };

  const handleCopy = async (text, messageId) => {
    await navigator.clipboard.writeText(text);
    setCopiedMap((prev) => new Map(prev).set(messageId, true));
    setTimeout(() => {
      setCopiedMap((prev) => {
        const newMap = new Map(prev);
        newMap.delete(messageId);
        return newMap;
      });
    }, 2000);
  };

  const handleSubmit = async (prompt) => {
    if (!prompt.trim()) return;

    const messageId = Date.now().toString();

    setIsSidebarOpen(false);

    setMessages((prev) => [
      ...prev,
      {
        id: messageId,
        text: prompt,
        isUser: true,
      },
    ]);

    setInputMessage("");

    setMessages((prev) => [
      ...prev,
      {
        id: `${messageId}-response`,
        text: "",
        isUser: false,
        isLoading: true,
      },
    ]);

    const response = await makeApiCall(prompt, messageId);

    if (response !== null) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === `${messageId}-response`
            ? { ...msg, text: response, isLoading: false }
            : msg
        )
      );
    }
  };

  const MessageBubble = ({ message }) => {
    const isPending =
      message.isLoading &&
      pendingCalls.has(message.id.replace("-response", ""));
    const isCopied = copiedMap.get(message.id);

    return (
      <div
        className={`flex items-start gap-2 ${
          message.isUser ? "justify-end" : "justify-start"
        } mb-4`}
      >
        <div
          className={`relative max-w-[80%] p-3 rounded-lg ${
            message.isUser
              ? "bg-sky-900 text-white"
              : "bg-gray-800 text-gray-100"
          }`}
        >
          {message.isLoading ? (
            <div className="flex space-x-2 h-6 items-center">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
            </div>
          ) : (
            <>
              <div className="prose prose-invert max-w-none break-words">
                {message.isUser ? (
                  <pre className="whitespace-pre-wrap font-sans">
                    {message.text}
                  </pre>
                ) : (
                  <ReactMarkdown
                    className="markdown-content"
                    components={{
                      pre: ({ children }) => children,
                      code: ({
                        node,
                        inline,
                        className,
                        children,
                        ...props
                      }) => {
                        if (inline) {
                          return (
                            <code
                              className="bg-gray-900 p-1 rounded"
                              {...props}
                            >
                              {children}
                            </code>
                          );
                        }
                        return (
                          <CodeBlock className={className}>
                            {children}
                          </CodeBlock>
                        );
                      },
                    }}
                  >
                    {message.text}
                  </ReactMarkdown>
                )}
              </div>
              {!message.isUser && (
                <div className="flex gap-2 mt-4">
                  {!isPending && (
                    <button
                      onClick={() => handleCopy(message.text, message.id)}
                      className="p-2 text-gray-400 hover:text-gray-200 bg-gray-800 hover:bg-gray-700 rounded transition-colors"
                      title="Copy response"
                    >
                      {isCopied ? (
                        <Check size={16} className="text-green-400" />
                      ) : (
                        <Copy size={16} />
                      )}
                    </button>
                  )}
                  {isPending ? (
                    <button
                      onClick={() =>
                        handleCancel(message.id.replace("-response", ""))
                      }
                      className="p-2 text-red-400 hover:text-red-600 bg-gray-800 hover:bg-gray-700 rounded transition-colors"
                      title="Cancel request"
                    >
                      <X size={16} />
                    </button>
                  ) : (
                    <button
                      onClick={() => handleRetry(message.id)}
                      className="p-2 text-blue-400 hover:text-blue-600 bg-gray-800 hover:bg-gray-700 rounded transition-colors"
                      title="Retry request"
                    >
                      <RotateCcw size={16} />
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div
        className={`fixed lg:relative lg:translate-x-0 z-20 h-full bg-slate-900 w-64 shadow-md transition-transform ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } sidebar overflow-y-auto`}
      >
        <div className="p-4 space-y-4">
          <div className="py-[18px] sticky top-0 bg-slate-900">
            <h2 className="text-white font-bold text-xl">Ideas</h2>
          </div>
          <ul className="space-y-2">
            {samplePrompts.map((prompt, idx) => (
              <li key={idx}>
                <button
                  className={`block w-full text-left p-2 rounded bg-slate-800 text-white hover:bg-slate-700  transition-colors ${
                    idx === 0 &&
                    "border-2 border-cyan-500 rounded-lg block w-full text-left p-2 rounded bg-slate-800 text-white transition-all duration-500 border-2 border-cyan-500 rounded-lg animate-border focus:outline-none"
                  }`}
                  onClick={() => handleSubmit(prompt)}
                >
                  {prompt}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col flex-1 min-h-0">
        {/* Header */}
        <div className="flex-shrink-0 bg-slate-900 flex items-center justify-between px-4 py-2 shadow-md">
          <button
            onClick={() => setIsSidebarOpen((prev) => !prev)}
            className="text-gray-300 hover:text-white p-2 rounded menu-button lg:hidden"
          >
            {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <div className="flex justify-between items-center w-full">
            <h1 className="text-white font-bold text-3xl">
              <span className="text-sky-400">Go</span>Fr-GPT
            </h1>
            <a href="https://zop.dev/" target="_blank">
              <p className="text-white text-sm -mb-1 italic text-right">
                powered by
              </p>
              {/* <span className="text-[#0796b5] font-semibold text-xl ">
                {" "}
                zop.dev
              </span> */}
              <svg
                width="100px"
                // height="100px"
                viewBox="0 0 417 134"
                version="1.1"
                xmlns="http://www.w3.org/2000/svg"
                xmlnsXlink="http://www.w3.org/1999/xlink"
              >
                <title>zop.dev logo</title>
                <defs>
                  <linearGradient
                    x1="6.33993111%"
                    y1="71.3986908%"
                    x2="89.1162934%"
                    y2="26.8220436%"
                    id="linearGradient-1"
                  >
                    <stop stopColor="#06b6d4" offset="0%" />
                    <stop stopColor="#0a91b1" offset="100%" />
                  </linearGradient>
                </defs>
                <g
                  id="Stickers"
                  stroke="none"
                  strokeWidth={1}
                  fill="none"
                  fillRule="evenodd"
                >
                  <g id="Zop.dev-Logo-Copy">
                    <g id="Group-3-Copy">
                      <path
                        d="M50.6011458,2.58651101 C56.5330024,-0.862170336 63.8415898,-0.862170336 69.7734464,2.58651101 L110.788773,26.433336 C116.719306,29.8820173 120.376247,36.2558123 120.376247,43.1535083 L120.376247,90.8464917 C120.376247,97.7441877 116.719306,104.117983 110.788773,107.566664 L69.7734464,131.413489 C63.8415898,134.86217 56.5330024,134.86217 50.6011458,131.413489 L9.58581932,107.566664 C3.65396275,104.117983 0,97.7441877 0,90.8464917 L0,43.153175 C0,36.2558123 3.65396275,29.8820173 9.58581932,26.433336 L50.6011458,2.58651101 Z"
                        id="Path"
                        fill="url(#linearGradient-1)"
                        fillRule="nonzero"
                      />
                      <path
                        d="M37.0218143,85.3305345 L21.848652,94.1778619 C18.6533789,96.040843 14.6542406,93.7189487 14.6542406,90.0006516 L14.6542406,40.8319472 C14.6542406,39.1042738 15.570958,37.5085755 17.0578935,36.647405 L55.4018327,14.4449358 C58.5971058,12.5946189 62.5839991,14.9171798 62.5839991,18.6291447 L62.5839991,33.6736338"
                        id="Path"
                        stroke="#a5f3fc"
                        strokeWidth="2.23333333"
                      />
                      <path
                        d="M36.2219204,100.891259 L36.2219204,51.6935604 C36.2219204,49.965887 37.1389688,48.3701887 38.6259042,47.5090182 L76.9698434,25.306549 C80.1651165,23.4562322 84.1520099,25.7787931 84.1520099,29.490758 L84.1520099,78.6887902 C84.1520099,80.4161303 83.2352925,82.0118286 81.748357,82.8729991 L43.4040869,105.075802 C40.2088137,106.925785 36.2219204,104.603224 36.2219204,100.891259 Z"
                        id="Path"
                        stroke="#67e8f9"
                        strokeWidth="2.23333333"
                      />
                      <path
                        d="M57.790924,115.370189 L57.790924,66.1721565 C57.790924,64.4444831 58.7076414,62.8487848 60.1945769,61.9879476 L98.5385161,39.7851451 C101.73412,37.9348282 105.722006,40.2577224 105.722006,43.9693541 L105.722006,93.1673863 C105.722006,94.8947264 104.805289,96.4904247 103.316037,97.3515952 L64.9730904,119.554398 C61.7778173,121.404715 57.790924,119.08182 57.790924,115.370189 Z"
                        id="Path"
                        fill="#FFFFFF"
                        fillRule="nonzero"
                      />
                      <path
                        d="M72.7708144,100.57132 C71.037325,101.750764 69.2690863,102.047707 67.8920245,101.179871 C65.1842333,99.4735274 65.0131348,93.9112456 67.5097832,88.7558869 C68.9606457,85.7594534 70.9936402,83.5602025 72.9733527,82.5787214 C72.1814015,80.0335359 72.62917,76.2612491 74.3613356,72.684592 C76.857984,67.5292333 81.0765388,64.7334285 83.7843301,66.4397726 C84.938004,67.1666352 85.6310027,68.5936987 85.8537286,70.3910256 C87.8129225,68.7626668 89.8965516,68.2341 91.4695328,69.2255792 C92.297226,69.7471473 92.8879627,70.6289806 93.2377714,71.7491022 C94.8094288,70.8349417 96.376453,70.6659736 97.6231224,71.451825 C100.330914,73.1581691 100.502012,78.7204509 98.0053638,83.8758095 C96.6316115,86.7129398 94.735959,88.8355386 92.8575157,89.8863399 L92.8575157,89.8893393 L72.7598932,100.601647 L72.7708144,100.57132 Z"
                        id="Path"
                        fill="#0a91b1"
                      />
                    </g>
                    <g id="zop.dev" transform="translate(145, 32)">
                      <path
                        d="M0,53.8536585 L0,48.4630335 L21.8475267,20.6684451 L21.8475267,20.3003049 L0.708994257,20.3003049 L0.708994257,13.4634146 L31.6421511,13.4634146 L31.6421511,19.1958841 L10.6349139,46.648628 L10.6349139,47.0167683 L32.3774044,47.0167683 L32.3774044,53.8536585 L0,53.8536585 Z M58.6101919,54.6688262 C54.8288892,54.6688262 51.5290024,53.8010671 48.7105314,52.0655488 C45.8920604,50.3300305 43.7038065,47.9020579 42.1457697,44.7816311 C40.587733,41.6612043 39.8087146,38.0148628 39.8087146,33.8426067 C39.8087146,29.6528201 40.587733,25.9889482 42.1457697,22.8509909 C43.7038065,19.7130335 45.8920604,17.2762957 48.7105314,15.5407774 C51.5290024,13.8052591 54.8288892,12.9375 58.6101919,12.9375 C62.3914946,12.9375 65.6913815,13.8052591 68.5098525,15.5407774 C71.3283235,17.2762957 73.5165773,19.7130335 75.0746141,22.8509909 C76.6326509,25.9889482 77.4116693,29.6528201 77.4116693,33.8426067 C77.4116693,38.0148628 76.6326509,41.6612043 75.0746141,44.7816311 C73.5165773,47.9020579 71.3283235,50.3300305 68.5098525,52.0655488 C65.6913815,53.8010671 62.3914946,54.6688262 58.6101919,54.6688262 Z M58.636451,48.0685976 C61.0872953,48.0685976 63.1179949,47.4199695 64.7285498,46.1227134 C66.3391046,44.8254573 67.5338912,43.0987043 68.3129096,40.9424543 C69.091928,38.7862043 69.4814372,36.4108232 69.4814372,33.816311 C69.4814372,31.2393293 69.091928,28.8683308 68.3129096,26.7033155 C67.5338912,24.5383003 66.3391046,22.7983994 64.7285498,21.4836128 C63.1179949,20.1688262 61.0872953,19.5114329 58.636451,19.5114329 C56.1681006,19.5114329 54.1242715,20.1688262 52.5049636,21.4836128 C50.8856557,22.7983994 49.6864926,24.5383003 48.9074742,26.7033155 C48.1284558,28.8683308 47.7389466,31.2393293 47.7389466,33.816311 C47.7389466,36.4108232 48.1284558,38.7862043 48.9074742,40.9424543 C49.6864926,43.0987043 50.8856557,44.8254573 52.5049636,46.1227134 C54.1242715,47.4199695 56.1681006,48.0685976 58.636451,48.0685976 Z M86.1559318,69 L86.1559318,13.4634146 L93.8235734,13.4634146 L93.8235734,20.0110518 L94.4800495,20.0110518 C94.9352063,19.1695884 95.5916825,18.1966463 96.449478,17.0922256 C97.3072735,15.9878049 98.4976836,15.0192454 100.020708,14.1865473 C101.543733,13.3538491 103.556927,12.9375 106.060289,12.9375 C109.316411,12.9375 112.222412,13.7614329 114.778293,15.4092988 C117.334173,17.0571646 119.34299,19.4325457 120.804744,22.5354421 C122.266497,25.6383384 122.997374,29.3723323 122.997374,33.7374238 C122.997374,38.1025152 122.270874,41.8408918 120.817873,44.9525534 C119.364873,48.0642149 117.369185,50.4571265 114.830811,52.1312881 C112.292436,53.8054497 109.395188,54.6425305 106.139066,54.6425305 C103.688222,54.6425305 101.688158,54.230564 100.138874,53.4066311 C98.5895903,52.5826982 97.3772977,51.6185213 96.5019961,50.5141006 C95.6266945,49.4096799 94.9527124,48.4279726 94.4800495,47.5689787 L94.0073867,47.5689787 L94.0073867,69 L86.1559318,69 Z M93.8498324,33.6585366 C93.8498324,36.4984756 94.2612241,38.9878049 95.0840076,41.1265244 C95.906791,43.2652439 97.0972012,44.9350229 98.6552379,46.1358613 C100.213275,47.3366997 102.121432,47.9371189 104.37971,47.9371189 C106.725518,47.9371189 108.686194,47.310404 110.261736,46.0569741 C111.837279,44.8035442 113.032066,43.0987043 113.846096,40.9424543 C114.660127,38.7862043 115.067142,36.3582317 115.067142,33.6585366 C115.067142,30.9939024 114.66888,28.6009909 113.872355,26.4798018 C113.075831,24.3586128 111.885421,22.6844512 110.301125,21.4573171 C108.716829,20.2301829 106.743024,19.6166159 104.37971,19.6166159 C102.103926,19.6166159 100.182639,20.2038872 98.6158493,21.3784299 C97.0490596,22.5529726 95.863026,24.1920732 95.0577485,26.2957317 C94.2524711,28.3993902 93.8498324,30.8536585 93.8498324,33.6585366 Z"
                        id="Combined-Shape"
                        fill="#0a91b1"
                      />
                      <path
                        d="M136.415747,54.2480945 C135.382891,54.2480945 134.49446,53.8755716 133.750454,53.1305259 C133.006447,52.3854802 132.634444,51.4958079 132.634444,50.4615091 C132.634444,49.4096799 133.006447,48.515625 133.750454,47.7793445 C134.49446,47.043064 135.382891,46.6749238 136.415747,46.6749238 C137.466109,46.6749238 138.358916,47.043064 139.09417,47.7793445 C139.829423,48.515625 140.19705,49.4096799 140.19705,50.4615091 C140.19705,51.1451982 140.026366,51.7762957 139.684998,52.3548018 C139.343631,52.9333079 138.888474,53.3934832 138.319528,53.7353277 C137.750582,54.0771723 137.115988,54.2480945 136.415747,54.2480945 Z"
                        id="Path"
                        fill="white"
                        fillRule="nonzero"
                      />
                      <path
                        d="M167.033795,54.695122 C163.730899,54.695122 160.833651,53.8200356 158.342051,52.0698629 C155.85045,50.3196902 153.910221,47.8756252 152.521364,44.7376679 C151.132506,41.5997106 150.438078,37.9417278 150.438078,33.7637195 C150.438078,29.6147461 151.135379,25.9742253 152.52998,22.8421571 C153.924582,19.710089 155.873564,17.2704751 158.376926,15.5233154 C160.880288,13.7761558 163.789298,12.902576 167.103956,12.902576 C169.566289,12.902576 171.608613,13.3393317 173.23093,14.212843 C174.853247,15.0863543 176.157446,16.1615348 177.143528,17.4383843 C178.12961,18.7152338 178.891122,19.9613365 179.428065,21.1766923 L179.84821,21.1766923 L179.84821,0 L184.539963,0 L184.539963,53.8536585 L179.988121,53.8536585 L179.988121,46.3507467 L179.428065,46.3507467 C178.879634,47.5836331 178.106497,48.8443216 177.108653,50.1328125 C176.110809,51.4213034 174.79348,52.503811 173.156666,53.3803354 C171.519852,54.2568598 169.478895,54.695122 167.033795,54.695122 Z M167.593851,50.417546 C170.20225,50.417546 172.42408,49.7003025 174.259341,48.2658155 C176.094602,46.8313286 177.496589,44.8562726 178.465302,42.3406476 C179.434014,39.8250226 179.918371,36.942627 179.918371,33.6934606 C179.918371,30.4678508 179.438391,27.614764 178.478431,25.1341999 C177.518472,22.6536359 176.120861,20.7078202 174.2856,19.2967529 C172.450339,17.8856856 170.219756,17.180152 167.593851,17.180152 C164.897923,17.180152 162.623643,17.9091053 160.771013,19.3670118 C158.918382,20.8249184 157.515028,22.7999744 156.560949,25.2921798 C155.60687,27.7843851 155.129831,30.5848121 155.129831,33.6934606 C155.129831,36.8256657 155.611247,39.6554015 156.574078,42.1826678 C157.53691,44.7099341 158.944641,46.7142304 160.797272,48.1955566 C162.649902,49.6768829 164.915429,50.417546 167.593851,50.417546 Z"
                        id="Shape"
                        fill="white"
                        fillRule="nonzero"
                      />
                      <path
                        d="M214.160065,54.695122 C210.396268,54.695122 207.13871,53.8127769 204.387391,52.0480868 C201.636073,50.2833967 199.513466,47.8378936 198.019573,44.7115776 C196.525679,41.5852616 195.778732,37.9826779 195.778732,33.9038265 C195.778732,29.8252489 196.527115,26.2052717 198.023881,23.0438947 C199.520646,19.8825177 201.596547,17.4019537 204.251583,15.6022026 C206.906619,13.8024515 209.975987,12.902576 213.459687,12.902576 C215.642197,12.902576 217.750237,13.3028326 219.783809,14.1033459 C221.817381,14.9038592 223.642384,16.1222281 225.25882,17.7584526 C226.875256,19.3946771 228.154701,21.4559475 229.097154,23.9422637 C230.039608,26.4285799 230.510835,29.3634301 230.510835,32.7468143 L230.510835,35.0608387 L198.999979,35.0608387 L198.999979,30.9237805 L225.748921,30.9237805 C225.748921,28.3235161 225.22668,25.9875786 224.182199,23.915968 C223.137718,21.8443574 221.690599,20.2038187 219.84084,18.994352 C217.991082,17.7848853 215.864031,17.180152 213.459687,17.180152 C210.892318,17.180152 208.637049,17.8608964 206.693879,19.2223853 C204.75071,20.5838742 203.233498,22.3865699 202.142243,24.6304723 C201.050988,26.8743748 200.493736,29.3343952 200.470485,32.0105338 L200.470485,34.465076 C200.470485,37.6731552 201.029174,40.4736507 202.146551,42.8665623 C203.263928,45.2594738 204.84672,47.116199 206.894925,48.4367378 C208.943131,49.7572766 211.364844,50.417546 214.160065,50.417546 C216.073966,50.417546 217.753041,50.1166516 219.197289,49.5148628 C220.641536,48.913074 221.855333,48.1096162 222.83868,47.1044892 C223.822026,46.0993623 224.570409,44.994873 225.083828,43.7910216 L229.530223,45.2286585 C228.911768,46.9233637 227.908112,48.4894662 226.519254,49.9269662 C225.130397,51.3644662 223.3973,52.5185338 221.319963,53.3891691 C219.242626,54.2598043 216.855994,54.695122 214.160065,54.695122 Z"
                        id="Path"
                        fill="white"
                        fillRule="nonzero"
                      />
                      <polygon
                        id="Path"
                        fill="white"
                        fillRule="nonzero"
                        points="272 13.4634146 257.260059 53.8536585 252.288072 53.8536585 237.548131 13.4634146 242.625153 13.4634146 254.598868 47.6827899 254.949263 47.6827899 266.923388 13.4634146"
                      />
                    </g>
                  </g>
                </g>
              </svg>
            </a>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 p-4 overflow-y-auto bg-gray-700">
          <div className="max-w-6xl mx-auto">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="flex-shrink-0 p-4 bg-slate-900 border-t border-gray-700">
          <form
            className="flex gap-2 max-w-6xl mx-auto"
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit(inputMessage);
            }}
          >
            <input
              ref={inputRef}
              className="flex-1 p-2 bg-gray-900 text-white rounded border border-gray-700 focus:outline-none focus:ring focus:ring-sky-400"
              placeholder="Type a message..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
            />
            <button
              type="submit"
              className="p-2 bg-sky-400 text-white rounded hover:bg-sky-500 focus:outline-none focus:ring focus:ring-sky-300"
            >
              <Send />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
