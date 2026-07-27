using System;
using System.IO;
using System.Linq;
using System.Collections.Generic;
using MoonSharp.Interpreter;
using MoonSharp.Interpreter.Debugging;

class Decompiler
{
    class MyDebugger : IDebugger
    {
        public string[] ByteCode { get; private set; }

        public void SetByteCode(string[] byteCode)
        {
            this.ByteCode = byteCode;
        }

        public void SetSourceCode(SourceCode sourceCode) {}
        public void SetProto(int id, string name) {}
        public void SignalExecutionDelay(long delay) {}
        public void Update(int line, int col) {}
        public DebuggerAction GetAction(int ip, SourceRef sourceRef)
        {
            return new DebuggerAction();
        }

        public DebuggerCaps GetDebuggerCaps()
        {
            return (DebuggerCaps)0;
        }

        public void SetDebugService(DebugService service) {}

        public bool IsPauseRequested()
        {
            return false;
        }

        public bool SignalRuntimeException(ScriptRuntimeException ex)
        {
            return false;
        }

        public void SignalExecutionEnded() {}

        public void Update(WatchType watchType, IEnumerable<WatchItem> items) {}

        public List<DynamicExpression> GetWatchItems()
        {
            return new List<DynamicExpression>();
        }

        public void RefreshBreakpoints(IEnumerable<SourceRef> breakpoints) {}
    }

    static void Main(string[] args)
    {
        if (args.Length < 2)
        {
            Console.WriteLine("Usage: Decompiler.exe <input.luac> <output.txt>");
            return;
        }

        string inputPath = args[0];
        string outputPath = args[1];

        try
        {
            Script script = new Script();
            MyDebugger dbg = new MyDebugger();
            script.AttachDebugger(dbg);

            using (FileStream fs = new FileStream(inputPath, FileMode.Open, FileAccess.Read))
            {
                script.LoadStream(fs);
            }

            if (dbg.ByteCode != null)
            {
                File.WriteAllLines(outputPath, dbg.ByteCode);
                Console.WriteLine("Successfully decompiled " + inputPath + " to " + outputPath);
            }
            else
            {
                Console.WriteLine("Error: No bytecode was captured.");
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine("Error: " + ex.Message);
        }
    }
}
