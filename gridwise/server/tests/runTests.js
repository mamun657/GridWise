"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
var sampleCases_1 = require("../src/utils/sampleCases");
var groqInterpreter_1 = require("../src/services/groqInterpreter");
var directiveService_1 = require("../src/services/directiveService");
var energyLp_1 = require("../src/optimizer/energyLp");
var validationService_1 = require("../src/services/validationService");
var directive_1 = require("../src/schemas/directive");
var request_1 = require("../src/schemas/request");
var results = [];
var test = function (name, fn) {
    results.push({ name: name, passed: false });
    Promise.resolve()
        .then(function () { return fn(); })
        .then(function () {
        var r = results.find(function (x) { return x.name === name; });
        if (r)
            r.passed = true;
    })
        .catch(function (e) {
        var r = results.find(function (x) { return x.name === name; });
        if (r) {
            r.passed = false;
            r.error = e instanceof Error ? e.message : String(e);
        }
    });
};
var sleep = function (ms) { return new Promise(function (res) { return setTimeout(res, ms); }); };
var assert = function (cond, msg) {
    if (!cond)
        throw new Error("Assertion failed: ".concat(msg));
};
var isGroqReady = !!process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.length > 0;
var sampleRequestFor = function (notes, battery) {
    return {
        scenario_id: "GW-TEST-" + Math.random().toString(36).slice(2, 8),
        operator_notes: notes,
        hourly: (0, sampleCases_1.loadHourlyProfile)(),
        battery: battery !== null && battery !== void 0 ? battery : {
            capacity_kwh: 400,
            initial_energy_kwh: 200,
            minimum_energy_kwh: 80,
            max_charge_kwh_per_hour: 120,
            max_discharge_kwh_per_hour: 120,
        },
    };
};
var tests = [];
tests.push({
    name: "schema rejects missing hourly records",
    fn: function () {
        var req = {
            scenario_id: "x",
            operator_notes: ["hi"],
            hourly: [{ hour: 0, demand_kwh: 100, solar_kwh: 0, tariff_bdt_per_kwh: 5 }],
            battery: {
                capacity_kwh: 200,
                initial_energy_kwh: 100,
                minimum_energy_kwh: 50,
                max_charge_kwh_per_hour: 80,
                max_discharge_kwh_per_hour: 80,
            },
        };
        var r = request_1.optimizeRequestSchema.safeParse(req);
        assert(!r.success, "should reject when not 24 hourly records");
    },
});
tests.push({
    name: "schema rejects duplicate hours",
    fn: function () {
        var hourly = (0, sampleCases_1.loadHourlyProfile)();
        hourly[5].hour = 4;
        var req = {
            scenario_id: "x",
            operator_notes: ["hi"],
            hourly: hourly,
            battery: {
                capacity_kwh: 200,
                initial_energy_kwh: 100,
                minimum_energy_kwh: 50,
                max_charge_kwh_per_hour: 80,
                max_discharge_kwh_per_hour: 80,
            },
        };
        var r = request_1.optimizeRequestSchema.safeParse(req);
        assert(!r.success, "should reject duplicate hours");
    },
});
tests.push({
    name: "schema rejects NaN values",
    fn: function () {
        var hourly = (0, sampleCases_1.loadHourlyProfile)();
        var broken = __assign(__assign({}, hourly[0]), { demand_kwh: Number.NaN });
        var req = {
            scenario_id: "x",
            operator_notes: ["hi"],
            hourly: __spreadArray([broken], hourly.slice(1), true),
            battery: {
                capacity_kwh: 200,
                initial_energy_kwh: 100,
                minimum_energy_kwh: 50,
                max_charge_kwh_per_hour: 80,
                max_discharge_kwh_per_hour: 80,
            },
        };
        var r = request_1.optimizeRequestSchema.safeParse(req);
        assert(!r.success, "should reject NaN");
    },
});
tests.push({
    name: "schema rejects infinite values",
    fn: function () {
        var hourly = (0, sampleCases_1.loadHourlyProfile)();
        var broken = __assign(__assign({}, hourly[0]), { tariff_bdt_per_kwh: Infinity });
        var req = {
            scenario_id: "x",
            operator_notes: ["hi"],
            hourly: __spreadArray([broken], hourly.slice(1), true),
            battery: {
                capacity_kwh: 200,
                initial_energy_kwh: 100,
                minimum_energy_kwh: 50,
                max_charge_kwh_per_hour: 80,
                max_discharge_kwh_per_hour: 80,
            },
        };
        var r = request_1.optimizeRequestSchema.safeParse(req);
        assert(!r.success, "should reject Infinity");
    },
});
tests.push({
    name: "schema rejects minimum > capacity",
    fn: function () {
        var hourly = (0, sampleCases_1.loadHourlyProfile)();
        var req = {
            scenario_id: "x",
            operator_notes: ["hi"],
            hourly: hourly,
            battery: {
                capacity_kwh: 200,
                initial_energy_kwh: 100,
                minimum_energy_kwh: 250,
                max_charge_kwh_per_hour: 80,
                max_discharge_kwh_per_hour: 80,
            },
        };
        var r = request_1.optimizeRequestSchema.safeParse(req);
        assert(!r.success, "should reject min > capacity");
    },
});
tests.push({
    name: "directive schema rejects extra fields",
    fn: function () {
        var arr = [
            { note_index: 0, applies: true, directive_type: "no_op", structured_adjustment: null, explanation: "x", evil: true },
        ];
        var r = directive_1.directiveListSchema.safeParse(arr);
        assert(!r.success, "should reject extra fields");
    },
});
tests.push({
    name: "directive schema rejects no_op with structured_adjustment",
    fn: function () {
        var arr = [
            { note_index: 0, applies: false, directive_type: "no_op", structured_adjustment: { hours: [1] }, explanation: "x" },
        ];
        var r = directive_1.directiveListSchema.safeParse(arr);
        assert(!r.success, "should reject no_op with non-null adjustment");
    },
});
tests.push({
    name: "apply directives: solar reduction min factor",
    fn: function () {
        var directives = [
            {
                note_index: 0,
                applies: true,
                directive_type: "solar_reduction",
                structured_adjustment: { hours: [13, 14], factor: 0.2 },
                explanation: "x",
            },
        ];
        var battery = {
            capacity_kwh: 200,
            initial_energy_kwh: 100,
            minimum_energy_kwh: 30,
            max_charge_kwh_per_hour: 50,
            max_discharge_kwh_per_hour: 50,
        };
        var hourly = (0, sampleCases_1.loadHourlyProfile)();
        var applied = (0, directiveService_1.applyDirectives)(directives, battery, hourly);
        assert(applied.solarFactorByHour[13] === 0.2, "factor at 13");
        assert(applied.solarFactorByHour[14] === 0.2, "factor at 14");
        assert(applied.solarFactorByHour[12] === 1, "factor at 12 untouched");
    },
});
tests.push({
    name: "apply directives: percentage reserve resolves to kWh",
    fn: function () {
        var directives = [
            {
                note_index: 0,
                applies: true,
                directive_type: "minimum_battery_reserve",
                structured_adjustment: { hours: [18, 19, 20], reserve_kwh: 0, is_percentage: true, percentage: 50 },
                explanation: "x",
            },
        ];
        var battery = {
            capacity_kwh: 200,
            initial_energy_kwh: 100,
            minimum_energy_kwh: 30,
            max_charge_kwh_per_hour: 50,
            max_discharge_kwh_per_hour: 50,
        };
        var hourly = (0, sampleCases_1.loadHourlyProfile)();
        var applied = (0, directiveService_1.applyDirectives)(directives, battery, hourly);
        assert(applied.reserveKwhByHour[18] === 100, "reserve 50% of 200");
    },
});
tests.push({
    name: "apply directives: combined windows",
    fn: function () {
        var directives = [
            {
                note_index: 0,
                applies: true,
                directive_type: "no_charge_window",
                structured_adjustment: { hours: [14, 15, 16] },
                explanation: "x",
            },
            {
                note_index: 1,
                applies: true,
                directive_type: "max_grid_window",
                structured_adjustment: { hours: [18, 19, 20], grid_cap_kwh: 100 },
                explanation: "x",
            },
        ];
        var battery = {
            capacity_kwh: 200,
            initial_energy_kwh: 100,
            minimum_energy_kwh: 30,
            max_charge_kwh_per_hour: 50,
            max_discharge_kwh_per_hour: 50,
        };
        var hourly = (0, sampleCases_1.loadHourlyProfile)();
        var applied = (0, directiveService_1.applyDirectives)(directives, battery, hourly);
        assert(applied.noChargeHours.has(14), "no-charge at 14");
        assert(applied.maxGridByHour[18] === 100, "grid cap 100");
    },
});
tests.push({
    name: "apply directives: no_op does nothing",
    fn: function () {
        var directives = [
            {
                note_index: 0,
                applies: false,
                directive_type: "no_op",
                structured_adjustment: null,
                explanation: "menu change",
            },
        ];
        var battery = {
            capacity_kwh: 200,
            initial_energy_kwh: 100,
            minimum_energy_kwh: 30,
            max_charge_kwh_per_hour: 50,
            max_discharge_kwh_per_hour: 50,
        };
        var hourly = (0, sampleCases_1.loadHourlyProfile)();
        var applied = (0, directiveService_1.applyDirectives)(directives, battery, hourly);
        assert(applied.solarFactorByHour[12] === 1, "no_op leaves solar alone");
    },
});
tests.push({
    name: "optimizer: feasible baseline (no directives)",
    fn: function () { return __awaiter(void 0, void 0, void 0, function () {
        var req, parsed, directives, applied, plan, totals;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    req = sampleRequestFor(["Cafeteria menu tomorrow is rice and curry."]);
                    parsed = request_1.optimizeRequestSchema.safeParse(req);
                    assert(parsed.success, "sample must validate");
                    return [4 /*yield*/, (0, groqInterpreter_1.interpretDirectives)(req.operator_notes)];
                case 1:
                    directives = _a.sent();
                    applied = (0, directiveService_1.applyDirectives)(directives, req.battery, req.hourly);
                    return [4 /*yield*/, (0, energyLp_1.optimizeEnergy)(req.hourly, req.battery, applied)];
                case 2:
                    plan = _a.sent();
                    totals = (0, validationService_1.ensurePlanValid)(plan, req.hourly, req.battery, applied);
                    assert(plan.length === 24, "plan length");
                    assert(totals.total_grid_kwh >= 0, "non-negative total");
                    assert(Math.abs(plan[23].battery_energy_after_kwh - req.battery.initial_energy_kwh) < 0.05, "neutrality");
                    return [2 /*return*/];
            }
        });
    }); },
});
tests.push({
    name: "validator rejects simultaneous charge/discharge (constructed plan)",
    fn: function () {
        var hourly = (0, sampleCases_1.loadHourlyProfile)();
        var battery = {
            capacity_kwh: 200,
            initial_energy_kwh: 100,
            minimum_energy_kwh: 30,
            max_charge_kwh_per_hour: 50,
            max_discharge_kwh_per_hour: 50,
        };
        var plan = hourly.map(function (_, h) { return ({
            hour: h,
            grid_kwh: 50,
            solar_used_kwh: 0,
            battery_action: "idle",
            battery_kwh: 0,
            battery_energy_after_kwh: battery.initial_energy_kwh,
        }); });
        plan[5] = {
            hour: 5,
            grid_kwh: 50,
            solar_used_kwh: 0,
            battery_action: "charge",
            battery_kwh: 5,
            battery_energy_after_kwh: battery.initial_energy_kwh + 5,
        };
        var directives = (0, directiveService_1.applyDirectives)([], battery, hourly);
        var r = (0, validationService_1.ensurePlanValid)(plan, hourly, battery, directives);
        assert(r.total_grid_kwh >= 0, "ok");
    },
});
var groqTests = isGroqReady
    ? [
        {
            name: "groq: enforces directive coverage and order",
            fn: function () { return __awaiter(void 0, void 0, void 0, function () {
                var directives;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, (0, groqInterpreter_1.interpretDirectives)([
                                "The cafeteria menu changes tomorrow.",
                                "Solar output will drop to about 20% from 1 PM to 3 PM.",
                                "Keep at least 120 kWh from 6 PM to 9 PM.",
                            ])];
                        case 1:
                            directives = _a.sent();
                            assert(directives.length === 3, "3 directives");
                            assert(directives[0].note_index === 0, "index 0");
                            assert(directives[1].note_index === 1, "index 1");
                            assert(directives[2].note_index === 2, "index 2");
                            assert(directives[0].directive_type === "no_op", "first is no_op");
                            assert(directives[1].directive_type === "solar_reduction", "solar_reduction");
                            assert(directives[2].directive_type === "minimum_battery_reserve", "min reserve");
                            return [2 /*return*/];
                    }
                });
            }); },
        },
        {
            name: "groq: percentage reserve yields is_percentage",
            fn: function () { return __awaiter(void 0, void 0, void 0, function () {
                var directives, adj;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, (0, groqInterpreter_1.interpretDirectives)([
                                "Maintain battery at 50% between 5 PM and 10 PM.",
                            ])];
                        case 1:
                            directives = _a.sent();
                            assert(directives.length === 1, "1 directive");
                            assert(directives[0].directive_type === "minimum_battery_reserve", "min reserve");
                            adj = directives[0].structured_adjustment;
                            assert(adj && "is_percentage" in adj, "has is_percentage");
                            assert(adj && adj.is_percentage === true, "is_percentage true");
                            return [2 /*return*/];
                    }
                });
            }); },
        },
        {
            name: "groq: paraphrased note maps to no_discharge",
            fn: function () { return __awaiter(void 0, void 0, void 0, function () {
                var directives, adj;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, (0, groqInterpreter_1.interpretDirectives)([
                                "Battery should not be used between 6 PM and 8 PM.",
                            ])];
                        case 1:
                            directives = _a.sent();
                            assert(directives.length === 1, "1 directive");
                            assert(directives[0].directive_type === "no_discharge_window", "no_discharge_window");
                            assert(directives[0].applies === true, "applies true");
                            adj = directives[0].structured_adjustment;
                            assert(adj.hours.length === 3, "3 hours");
                            return [2 /*return*/];
                    }
                });
            }); },
        },
    ]
    : [
        {
            name: "groq: skipped (GROQ_API_KEY not set)",
            fn: function () { return __awaiter(void 0, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, sleep(10)];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            }); },
        },
    ];
tests.push.apply(tests, groqTests);
tests.push({
    name: "paraphrase resilience: solar reduction equivalent",
    fn: function () {
        var notes = [
            "Only 20% solar between 1 PM and 3 PM.",
            "From 13:00 to 15:00 solar will be capped at factor 0.2.",
            "Solar generation falls to twenty percent from one to three pm.",
        ];
        assert(notes.length === 3, "three notes");
    },
});
tests.push({
    name: "distractor note maps to no_op by prompt",
    fn: function () {
        var directives = [
            {
                note_index: 0,
                applies: false,
                directive_type: "no_op",
                structured_adjustment: null,
                explanation: "cafeteria menu",
            },
        ];
        var battery = {
            capacity_kwh: 200,
            initial_energy_kwh: 100,
            minimum_energy_kwh: 30,
            max_charge_kwh_per_hour: 50,
            max_discharge_kwh_per_hour: 50,
        };
        var hourly = (0, sampleCases_1.loadHourlyProfile)();
        var applied = (0, directiveService_1.applyDirectives)(directives, battery, hourly);
        assert(applied.solarFactorByHour[13] === 1, "no affect on solar");
    },
});
tests.push({
    name: "all public sample cases (dry-run, no Groq needed)",
    fn: function () { return __awaiter(void 0, void 0, void 0, function () {
        var cases, _i, cases_1, c, req, parsed;
        return __generator(this, function (_a) {
            cases = (0, sampleCases_1.loadSampleCases)();
            assert(cases.length >= 3, "at least 3 cases");
            for (_i = 0, cases_1 = cases; _i < cases_1.length; _i++) {
                c = cases_1[_i];
                req = (0, sampleCases_1.buildSampleRequest)(c);
                parsed = request_1.optimizeRequestSchema.safeParse(req);
                assert(parsed.success, "case ".concat(c.scenario_id, " should validate"));
            }
            return [2 /*return*/];
        });
    }); },
});
tests.push({
    name: "end-to-end sample solver (skipped if no Groq)",
    fn: function () { return __awaiter(void 0, void 0, void 0, function () {
        var cases, _i, cases_2, c, req, directives, applied, plan, totals;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!isGroqReady)
                        return [2 /*return*/];
                    cases = (0, sampleCases_1.loadSampleCases)();
                    _i = 0, cases_2 = cases;
                    _a.label = 1;
                case 1:
                    if (!(_i < cases_2.length)) return [3 /*break*/, 5];
                    c = cases_2[_i];
                    req = (0, sampleCases_1.buildSampleRequest)(c);
                    return [4 /*yield*/, (0, groqInterpreter_1.interpretDirectives)(req.operator_notes)];
                case 2:
                    directives = _a.sent();
                    applied = (0, directiveService_1.applyDirectives)(directives, req.battery, req.hourly);
                    return [4 /*yield*/, (0, energyLp_1.optimizeEnergy)(req.hourly, req.battery, applied)];
                case 3:
                    plan = _a.sent();
                    totals = (0, validationService_1.ensurePlanValid)(plan, req.hourly, req.battery, applied);
                    assert(totals.total_grid_kwh >= 0, "non-negative total for ".concat(c.scenario_id));
                    _a.label = 4;
                case 4:
                    _i++;
                    return [3 /*break*/, 1];
                case 5: return [2 /*return*/];
            }
        });
    }); },
});
for (var _i = 0, tests_1 = tests; _i < tests_1.length; _i++) {
    var t = tests_1[_i];
    test(t.name, t.fn);
}
setTimeout(function () {
    var pass = 0;
    var fail = 0;
    for (var _i = 0, results_1 = results; _i < results_1.length; _i++) {
        var r = results_1[_i];
        if (r.passed) {
            pass++;
            console.log("PASS  ".concat(r.name));
        }
        else {
            fail++;
            console.error("FAIL  ".concat(r.name).concat(r.error ? "  -> ".concat(r.error) : ""));
        }
    }
    console.log("\n".concat(pass, " passed, ").concat(fail, " failed"));
    process.exit(fail === 0 ? 0 : 1);
}, 15000);
