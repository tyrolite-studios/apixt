package apixt

import (
	"crypto/md5"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"runtime"
)

func printArgs(name string, args ...arg) {
	info := ""
	for i := 2; i < 5; i++ {
		pc, file, line, ok := runtime.Caller(i)
		if ok {
			fn := runtime.FuncForPC(pc).Name()
			if i == 2 {
				info += fmt.Sprintf("\033[90m%s:%d %s() <- %s()", file, line, name, fn)
			} else {
				info += fmt.Sprintf(" <- %s()", name)
			}
			if fn == "main.main" {
				break
			}
		}
	}
	fmt.Printf("%s\033[0m", info)
	fmt.Println()
	for _, x := range args {
		switch x.(type) {
		case string:
			x = fmt.Sprintf("\033[92m\"%s\"\033[0m", x)
		case nil:
			x = "nil"
		}
		fmt.Printf("%v \033[90m(%T)\033[0m ", x, x)
	}
	fmt.Println()
}

func d(args ...arg) arg {
	if len(args) == 0 {
		return nil
	}
	printArgs("d", args...)

	return args[0]
}

func d2(args ...arg) (arg, arg) {
	if len(args) == 0 {
		return nil, nil
	}
	printArgs("d2", args...)

	return args[0], args[1]
}

func generateHash(text string) string {
	hasher := md5.New()
	hasher.Write([]byte(text))
	hashBytes := hasher.Sum(nil)
	hashString := hex.EncodeToString(hashBytes)

	return hashString
}

func SplitString(input string) string {
	jsonStr, err := json.Marshal(input)
	if err != nil {
		panic("JSON problem")
	}
	return string(jsonStr)
}
