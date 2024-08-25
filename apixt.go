package apixt

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"html/template"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

var html_body string

type pair [2]string
type ctxKey int

const CrownKey ctxKey = 1

var doDebug bool = false

type arg interface{}

const DUMP_PARAM = "dump"
const STOP_NEXT_PREFIX = "-"

var jwtKey []byte

type Credentials struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type Claims struct {
	Username string `json:"username"`
	jwt.RegisteredClaims
}

type ApixtConfig struct {
	ApiId       string        `json:"apiId"`
	Permanent   bool          `json:"permanent"`
	BaseUrl     string        `json:"-"`
	DumpPath    string        `json:"dumpPath"`
	Routes      []string      `json:"routes"`
	DumpHeader  string        `json:"dumpHeader"`
	StorePrefix string        `json:"storePrefix"`
	JwtSecret   string        `json:"-"`
	Users       []Credentials `json:"-"`
}

var currConfig ApixtConfig

type bufferedResponseWriter struct {
	http.ResponseWriter
	buffer []byte
	status int
}

func newBufferedResponseWriter(w http.ResponseWriter) *bufferedResponseWriter {
	return &bufferedResponseWriter{ResponseWriter: w}
}

func (brw *bufferedResponseWriter) WriteHeader(status int) {
	brw.status = status
}

func (brw *bufferedResponseWriter) Write(data []byte) (int, error) {
	brw.buffer = append(brw.buffer, data...)
	return len(data), nil
}

type Dmux struct {
	handler *http.ServeMux
	oWriter *http.ResponseWriter
}

func (dm *Dmux) HandleFunc(pattern string, handler func(http.ResponseWriter, *http.Request)) {
	currConfig.Routes = append(currConfig.Routes, pattern)
	dm.handler.HandleFunc(pattern, handler)
}

func getHtmlJsonDump(jsonString string) string {

	var data map[string]interface{}
	if err := json.Unmarshal([]byte(jsonString), &data); err != nil {
		log.Fatalf("Could not unmarshal: %s", err)
	}

	jsonData, err := json.MarshalIndent(data, "", "  ")
	if err != nil {
		log.Fatalf("Could not marshal: %s", err)
	}
	return string(jsonData)
}

func getHtmlPlain(title string, pairs []pair) string {

	maxlen := 0
	for _, pair := range pairs {
		length := len([]rune(pair[0]))
		if maxlen < length {
			maxlen = length
		}
	}
	var lines []string
	for _, pair := range pairs {
		line := pair[0] + ":"
		for len(line) <= maxlen {
			line += " "
		}
		line += " " + pair[1]
		lines = append(lines, line)
	}
	return `<pre class="code">` + strings.Join(lines, "\n") + "</pre>"
}

func getHeaderDump(head http.Header) string {
	headers := []pair{}
	for name, value := range head {
		headers = append(headers, pair{name, strings.Join(value, "\n")})
	}
	sort.Slice(headers, func(i, j int) bool {
		return headers[i][0] < headers[j][0]
	})
	return getHtmlPlain("Header", headers)
}

func (s *Dmux) addDebug(out *dmpTree, w http.ResponseWriter, r *http.Request) {
	writer := newBufferedResponseWriter(w)
	w.Header().Set("Content-type", "text/html")

	s0 := out.StartSection("Request", 0)
	out.addDumbBlock("Headers", getHeaderDump(r.Header), blockOptions{id: "RequestHeaders", parent: s0})
	out.EndSection(s0)

	s1 := out.StartSection("Application", 0)
	out.EndSection(s1)

	out.StartTimer("total")
	s.handler.ServeHTTP(writer, r)
	out.StopTimer("total")

	times := []string{}
	for _, res := range out.Durations() {
		times = append(times, `"`+res.name+`": "`+fmt.Sprintf("%s", time.Duration(res.duration))+`"`)
	}
	timesJson := "{" + strings.Join(times, ",") + "}"
	oType := writer.Header().Get("Content-type")

	sr := out.StartSection("Response", 0)
	sri := out.StartSectionInfo(sr)
	out.addDumbBlock("Headers", getHeaderDump(w.Header()), blockOptions{id: "ResponseHeaders", parent: sri})
	out.EndSectionInfo(sri)
	footer := []pair{
		{"HTTP Code", fmt.Sprint(writer.status)},
		{"Content-type", oType},
	}
	var responseHtml string
	if oType == "application/json" {
		responseHtml += getHtmlJsonDump(string(writer.buffer))
	}
	out.addDumbBlock("Body", responseHtml, blockOptions{parent: sr, id: "ResponseBody", footer: footer, isError: writer.status < 200 || writer.status >= 400})
	out.EndSection(sr)

	out.addDumbBlock("Execution times", getHtmlJsonDump(timesJson), blockOptions{id: "ExecutionTimes"})
	out.abort()
}

func (s *Dmux) ServeHTTP(w http.ResponseWriter, r *http.Request) {

	var ctx context.Context
	out := NewDumpTree(r)
	dumpHeader := r.Header.Get(currConfig.DumpHeader)
	if dumpHeader != "" {
		out.IsActive = true
	}
	ctx = context.WithValue(r.Context(), CrownKey, out)

	r = r.WithContext(ctx)

	if !out.IsActive {
		s.handler.ServeHTTP(w, r)
		return
	}
	a := make(chan bool)
	out.abortChan = a
	s.oWriter = &w
	go s.addDebug(out, w, r)
	b := <-out.abortChan
	if b {
	}
	w.Write([]byte(out.getHtml()))
}

func Get(r *http.Request) *dmpTree {
	return r.Context().Value(CrownKey).(*dmpTree)
}

type PageData struct {
	Title  string
	CSS    template.CSS
	JS     template.JS
	Config template.JS
}

var apixtJs string

func getApixtJs() (string, error) {
	if apixtJs == "" {
		js, err := os.ReadFile(filepath.Join("..", "apixt", "web", "dist", "apixt.js"))
		if err != nil {
			return "", err
		}
		apixtJs = string(js)
	}
	return apixtJs, nil
}

func GetResolvedTemplate() (string, error) {

	css, err := os.ReadFile(filepath.Join("..", "apixt", "web", "dist", "index.css"))
	if err != nil {
		return "", err
	}
	js, err := os.ReadFile(filepath.Join("..", "apixt", "web", "dist", "index.js"))
	if err != nil {
		return "", err
	}

	tmpl, err := template.ParseFiles(
		filepath.Join("..", "apixt", "templates", "index.html"),
	)
	if err != nil {
		return "", err
	}

	bootConfig := struct {
		ApiId        string `json:"apiId"`
		Permanent    bool   `json:"permanent"`
		JwtCookieKey string `json:"jwtCookieKey"`
		StorePrefix  string `json:"storePrefix"`
	}{
		ApiId:        currConfig.ApiId,
		Permanent:    currConfig.Permanent,
		JwtCookieKey: jwtCookie,
		StorePrefix:  currConfig.StorePrefix,
	}

	bootConfigJSON, err := json.Marshal(bootConfig)
	if err != nil {
		fmt.Println("Error converting to JSON:", err)
	}

	data := PageData{
		Title:  "Login",
		CSS:    template.CSS(string(css)),
		JS:     template.JS(string(js)),
		Config: template.JS(string(bootConfigJSON)),
	}

	var renderedTemplate bytes.Buffer
	if err := tmpl.Execute(&renderedTemplate, data); err != nil {
		return "", err
	}
	return renderedTemplate.String(), nil
}

var jwtCookie string

func getClaimFromToken(token string) (Claims, error) {
	claims := &Claims{}

	tkn, err := jwt.ParseWithClaims(token, claims, func(token *jwt.Token) (interface{}, error) {
		return jwtKey, nil
	})
	if err != nil {
		return *claims, err
	}
	if !tkn.Valid {
		return *claims, err
	}
	return *claims, nil
}

func getConfigJson(username string) (string, error) {
	type configWithUsername struct {
		ApixtConfig
		Username string `json:"username"`
	}
	rawConfig := configWithUsername{
		ApixtConfig: currConfig,
		Username:    username,
	}
	jsonConfig, err := json.Marshal(rawConfig)
	if err != nil {
		return "", err
	}
	return string(jsonConfig), nil

}

func dumpJsHandler(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie(jwtCookie)
	validated := true
	claim, err := getClaimFromToken(cookie.Value)
	if err != nil {
		validated = false
	}
	if !validated {
		w.WriteHeader(http.StatusUnauthorized)
		return
	}
	w.Header().Set("Content-Type", "text/javascript")
	w.WriteHeader(http.StatusOK)
	body, err := getApixtJs()
	if err != nil {
		panic("No apixt js!")
	}

	configJson, err := getConfigJson(claim.Username)
	if err != nil {
		panic("Could not generate config json")
	}
	body += "; controller.startApp('apixt', "
	body += configJson
	body += ")"

	w.Write([]byte(body))
}

func sendAuthReponse(w http.ResponseWriter, creds Credentials) {

	expirationTime := time.Now().Add(5 * time.Minute)
	claims := &Claims{
		Username: creds.Username,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(jwtKey)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/json")
	w.WriteHeader(http.StatusOK)

	configJson, err := getConfigJson(creds.Username)
	if err != nil {
		panic("Could not generate config json")
	}
	body := `{"jwt": "` + tokenString + `", "config": ` + configJson + `}`

	w.Write([]byte(body))
}

func refreshHandler(w http.ResponseWriter, r *http.Request) {
	headerValue := r.Header.Get("Authorization")
	parts := strings.Fields(headerValue)

	if len(parts) != 2 || parts[0] != "Bearer" {
		w.WriteHeader(http.StatusUnauthorized)
		return
	}
	claim, err := getClaimFromToken(parts[1])
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		return
	}
	sendAuthReponse(w, Credentials{Username: claim.Username})
}

func loginHandler(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseForm(); err != nil {
		http.Error(w, "Unable to parse form", http.StatusBadRequest)
		return
	}
	username := r.FormValue("username")
	password := r.FormValue("password")

	for _, user := range currConfig.Users {
		if user.Username == username && user.Password == password {
			sendAuthReponse(w, user)
			return
		}
	}
	w.WriteHeader(http.StatusUnauthorized)
}

func indexHandler(w http.ResponseWriter, r *http.Request) {
	body, err := GetResolvedTemplate()
	if err != nil {
		panic(err)
	}
	w.Header().Set("Content-Type", "text/html")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(body))
}

func Init(oldHandler *http.ServeMux, config ApixtConfig) *Dmux {
	currConfig = config
	jwtCookie = currConfig.StorePrefix + config.ApiId + ".jwt"
	jwtKey = []byte(currConfig.JwtSecret)

	if html_body == "" {
		body, err := GetResolvedTemplate()
		if err != nil {
			panic(err)
		}
		html_body = body
	}
	var mux *Dmux = &Dmux{oldHandler, nil}
	var dumpRoute = " /" + config.DumpPath
	var dumpJsRoute = "GET" + dumpRoute + "/index.js"
	oldHandler.HandleFunc(dumpJsRoute, dumpJsHandler)
	oldHandler.HandleFunc("GET"+dumpRoute, indexHandler)
	oldHandler.HandleFunc("POST"+dumpRoute, loginHandler)
	oldHandler.HandleFunc("GET"+dumpRoute+"/refresh", refreshHandler)

	fmt.Printf("Registering dump route %s\n", dumpRoute)
	return mux
}
